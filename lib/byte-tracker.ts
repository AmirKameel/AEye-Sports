interface Track {
  id: number;
  class: string;
  bbox: [number, number, number, number];
  confidence: number;
  track_id: number;
  age: number;
  hits: number;
  time_since_update: number;
  state: 'tentative' | 'confirmed' | 'deleted';
}

interface TrackOptions {
  track_thresh?: number;
  track_buffer?: number;
  match_thresh?: number;
  min_box_area?: number;
  mot20?: boolean;
}

export default class ByteTracker {
  private tracks: Track[] = [];
  private track_id_count: number = 0;
  private options: Required<TrackOptions>;

  constructor(options: TrackOptions = {}) {
    this.options = {
      track_thresh: options.track_thresh || 0.5,
      track_buffer: options.track_buffer || 30,
      match_thresh: options.match_thresh || 0.8,
      min_box_area: options.min_box_area || 10,
      mot20: options.mot20 || false
    };
    console.log('ByteTracker initialized with options:', this.options);
  }

  private iou(box1: [number, number, number, number], box2: [number, number, number, number]): number {
    // Extract coordinates
    const [x1, y1, w1, h1] = box1;
    const [x2, y2, w2, h2] = box2;
    
    // Convert to format with top-left and bottom-right corners for calculation
    const box1_x1 = x1;
    const box1_y1 = y1;
    const box1_x2 = x1 + w1;
    const box1_y2 = y1 + h1;
    
    const box2_x1 = x2;
    const box2_y1 = y2;
    const box2_x2 = x2 + w2;
    const box2_y2 = y2 + h2;
    
    // Calculate intersection area
    const x_left = Math.max(box1_x1, box2_x1);
    const y_top = Math.max(box1_y1, box2_y1);
    const x_right = Math.min(box1_x2, box2_x2);
    const y_bottom = Math.min(box1_y2, box2_y2);
    
    if (x_right < x_left || y_bottom < y_top) {
      return 0.0;
    }
    
    const intersection_area = (x_right - x_left) * (y_bottom - y_top);
    const box1_area = (box1_x2 - box1_x1) * (box1_y2 - box1_y1);
    const box2_area = (box2_x2 - box2_x1) * (box2_y2 - box2_y1);
    
    // Calculate IoU
    const iou = intersection_area / (box1_area + box2_area - intersection_area);
    
    return iou;
  }

  update(detections: Track[]): Track[] {
    console.log(`ByteTracker.update called with ${detections.length} detections`);
    
    // 1. Update existing track states
    for (const track of this.tracks) {
      track.time_since_update += 1;
      
      // Mark tracks as deleted if they haven't been updated for too long
      if (track.time_since_update > this.options.track_buffer) {
        track.state = 'deleted';
      }
    }
    
    // 2. Match detections to existing tracks
    const matchResults = this.matchDetectionsToTracks(detections);
    
    // 3. Update matched tracks
    for (const match of matchResults.matches) {
      const [detectionIdx, trackIdx] = match;
      
      const detection = detections[detectionIdx];
      const track = this.tracks[trackIdx];
      
      // Update track with new detection data
      track.bbox = detection.bbox;
      track.confidence = detection.confidence;
      track.class = detection.class;
      track.time_since_update = 0;
      track.hits += 1;
      track.age += 1;
      
      // Mark as confirmed after certain number of hits
      if (track.hits >= 3) {
        track.state = 'confirmed';
      }
    }
    
    // 4. Create new tracks for unmatched detections
    for (const idx of matchResults.unmatchedDetections) {
      const detection = detections[idx];
      
      if (detection.confidence >= this.options.track_thresh) {
        const newTrack: Track = {
          ...detection,
          track_id: ++this.track_id_count,
          age: 1,
          hits: 1,
          time_since_update: 0,
          state: 'tentative'
        };
        
        this.tracks.push(newTrack);
      }
    }
    
    // 5. Remove deleted tracks
    this.tracks = this.tracks.filter(track => track.state !== 'deleted');
    
    // 6. Return active tracks (confirmed or tentative)
    const activeTracks = this.tracks.filter(
      track => track.state === 'confirmed' || track.state === 'tentative'
    );
    
    console.log(`ByteTracker returning ${activeTracks.length} active tracks`);
    return activeTracks;
  }
  
  private matchDetectionsToTracks(detections: Track[]): {
    matches: [number, number][];  // [detectionIdx, trackIdx]
    unmatchedDetections: number[];
    unmatchedTracks: number[];
  } {
    const result = {
      matches: [] as [number, number][],
      unmatchedDetections: [] as number[],
      unmatchedTracks: [] as number[]
    };
    
    // If no tracks or detections, return all as unmatched
    if (this.tracks.length === 0) {
      result.unmatchedDetections = detections.map((_, idx) => idx);
      return result;
    }
    
    if (detections.length === 0) {
      result.unmatchedTracks = this.tracks.map((_, idx) => idx);
      return result;
    }
    
    // Calculate IoU between each detection and track
    const iouMatrix: number[][] = [];
    
    for (let d = 0; d < detections.length; d++) {
      iouMatrix[d] = [];
      
      for (let t = 0; t < this.tracks.length; t++) {
        const iou = this.iou(detections[d].bbox, this.tracks[t].bbox);
        iouMatrix[d][t] = iou;
      }
    }
    
    // Track which detections and tracks have been matched
    const matchedDetections = new Set<number>();
    const matchedTracks = new Set<number>();
    
    // First match high confidence tracks
    for (let d = 0; d < detections.length; d++) {
      let bestTrackIdx = -1;
      let bestIou = this.options.match_thresh;
      
      for (let t = 0; t < this.tracks.length; t++) {
        if (matchedTracks.has(t)) continue;
        
        const iou = iouMatrix[d][t];
        if (iou >= bestIou) {
          bestIou = iou;
          bestTrackIdx = t;
        }
      }
      
      if (bestTrackIdx !== -1) {
        result.matches.push([d, bestTrackIdx]);
        matchedDetections.add(d);
        matchedTracks.add(bestTrackIdx);
      }
    }
    
    // Add unmatched detections and tracks
    for (let d = 0; d < detections.length; d++) {
      if (!matchedDetections.has(d)) {
        result.unmatchedDetections.push(d);
      }
    }
    
    for (let t = 0; t < this.tracks.length; t++) {
      if (!matchedTracks.has(t)) {
        result.unmatchedTracks.push(t);
      }
    }
    
    return result;
  }
} 