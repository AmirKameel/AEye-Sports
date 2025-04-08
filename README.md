# AI Sports Analyzer

An AI-powered application for analyzing football and tennis videos using computer vision and machine learning.

## Features

- **Football Analysis**: Detect and track players and the ball, identify events like passes, shots, tackles, and crosses, and provide tactical insights.
- **Tennis Analysis**: Track player and ball movements, calculate player speed and distance covered, and analyze player performance.
- **Video Upload**: Upload videos for analysis with a user-friendly drag-and-drop interface.
- **Real-time Processing**: Process videos at 2 frames per second and analyze data every 5 seconds.
- **Comprehensive Reports**: Generate detailed analysis reports with statistics and visualizations.

## Technologies Used

- **Next.js**: React framework for building the web application
- **TypeScript**: Type-safe JavaScript for better development experience
- **Supabase**: Backend-as-a-Service for database and storage
- **Roboflow**: AI models for object detection and tracking
- **OpenAI**: GPT models for analyzing sports data and generating insights
- **Tailwind CSS**: Utility-first CSS framework for styling

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn
- Supabase account
- Roboflow account
- OpenAI API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/AmirKameel/ai-sports-analyzer.git
   cd ai-sports-analyzer
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Run the setup script to configure your environment variables:
   ```bash
   npm run setup
   # or
   yarn setup
   ```
   This will create a `.env.local` file with your API keys.

4. Set up Supabase:
   - Create a new project in Supabase
   - Run the SQL script in `scripts/setup-supabase.sql` in the Supabase SQL editor
   - Create a storage bucket named `videos` with public access
   - Set up storage policies (see below)

5. Start the development server:
```bash
npm run dev
# or
yarn dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Setting Up Supabase Storage

For development purposes, the application uses a simulated file upload. To use actual Supabase storage in production:

1. Go to the Supabase dashboard and select your project
2. Navigate to Storage > Buckets
3. Create a new bucket named `videos`
4. Go to the Policies tab for the `videos` bucket
5. Add the following policies:

   **For anonymous read access:**
   - Policy name: "Public Read Access"
   - Allowed operations: SELECT
   - Policy definition: `true`

   **For file uploads (in production, restrict to authenticated users):**
   - Policy name: "Public Upload Access"
   - Allowed operations: INSERT
   - Policy definition: `true`

6. Uncomment the Supabase upload code in `components/VideoUploader.tsx` and comment out the simulated upload code

## Usage

1. Navigate to the Football or Tennis analysis page.
2. Upload a video file (MP4, MOV, AVI, or MKV format, max 100MB).
3. Click "Start Analysis" to begin processing the video.
4. Wait for the analysis to complete (this may take a few minutes depending on the video length).
5. View the detailed analysis results, including player tracking, event detection, and tactical insights.

## Project Structure

- `/app`: Next.js app router pages and layouts
  - `/api`: Server-side API routes
    - `/analyze`: API route for starting video analysis
    - `/analysis/[id]`: API route for fetching analysis results
  - `/football`: Football analysis pages
  - `/tennis`: Tennis analysis pages
- `/components`: Reusable React components
- `/lib`: Utility functions and API clients
  - `supabase.ts`: Supabase client and database functions
  - `openai.ts`: OpenAI API integration
  - `roboflow.ts`: Roboflow API integration
  - `video-processor.ts`: Video processing logic
- `/scripts`: Utility scripts
  - `setup-env.js`: Script to set up environment variables
  - `setup-supabase.sql`: SQL script to set up Supabase database schema

## API Routes

The application uses Next.js API routes to handle server-side processing:

- **POST /api/analyze**: Starts the analysis process for a video
  - Request body: `{ videoUrl: string, sportType: 'football' | 'tennis', userId: string }`
  - Response: `{ analysisId: string }`

- **GET /api/analysis/[id]**: Fetches the analysis results for a given ID
  - Response: `{ analysis: VideoAnalysis }`

## Important Notes

- For development purposes, the OpenAI client is configured with `dangerouslyAllowBrowser: true`. In a production environment, you should ensure all OpenAI API calls are made server-side.
- The video processing and file uploads are simulated in this demo. In a production environment, you would implement actual video frame extraction and processing, and use Supabase storage for file uploads.
- For a production deployment, consider using a queue system (like AWS SQS) or a worker service for handling long-running video processing tasks.

## Troubleshooting

### Supabase Storage Issues

If you encounter errors like "new row violates row-level security policy" when uploading files to Supabase:

1. Make sure you've created the `videos` bucket in Supabase
2. Check that you've set up the correct storage policies as described above
3. For development, you can use the simulated upload functionality already implemented

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.io/)
- [Roboflow](https://roboflow.com/)
- [OpenAI](https://openai.com/)
- [Tailwind CSS](https://tailwindcss.com/)
