'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface PlayerProfile {
  fullName: string;
  position: string;
  dateOfBirth: string;
  nationality: string;
  height: string;
  weight: string;
  preferredFoot: string;
  phoneNumber: string;
  email: string;
  city: string;
  country: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  clubs: {
    name: string;
    logo?: string;
  }[];
  profileImage?: string;
}

const getPositionDefaults = (position: string) => {
  const positionMap: Record<string, { description: string; strengths: string[] }> = {
    'CF': {
      description: 'A clinical Center Forward with natural goal-scoring instincts.',
      strengths: ['Finishing', 'Positioning', 'Shot Power', 'Headers', 'Movement']
    },
    'ST': {
      description: 'A dynamic Striker who combines physical presence with technical ability.',
      strengths: ['Finishing', 'Shot Power', 'Headers', 'Movement', 'Ball Control']
    },
    'CAM': {
      description: 'A creative attacking midfielder who excels at linking play and creating chances.',
      strengths: ['Vision', 'Passing', 'Ball Control', 'Dribbling', 'Creativity']
    },
    'CM': {
      description: 'A well-rounded Central Midfielder who can contribute both defensively and offensively.',
      strengths: ['Passing', 'Vision', 'Stamina', 'Ball Control', 'Tactical Awareness']
    },
    'CDM': {
      description: 'A defensive midfielder specializing in breaking up play and protecting the back line.',
      strengths: ['Tackling', 'Positioning', 'Interceptions', 'Physical Strength', 'Game Reading']
    },
    'CB': {
      description: 'A commanding Center Back with strong defensive abilities and leadership qualities.',
      strengths: ['Tackling', 'Headers', 'Positioning', 'Physical Strength', 'Leadership']
    },
    'LB': {
      description: 'An athletic Left Back who balances defensive duties with attacking support.',
      strengths: ['Speed', 'Stamina', 'Tackling', 'Crossing', 'Positioning']
    },
    'RB': {
      description: 'A dynamic Right Back combining defensive solidity with attacking threat.',
      strengths: ['Speed', 'Stamina', 'Tackling', 'Crossing', 'Positioning']
    },
    'GK': {
      description: 'A reliable Goalkeeper with excellent shot-stopping abilities and commanding presence.',
      strengths: ['Shot Stopping', 'Reflexes', 'Positioning', 'Command of Area', 'Distribution']
    },
    'LW': {
      description: 'A skillful Left Winger who creates chances and threatens goal.',
      strengths: ['Dribbling', 'Speed', 'Crossing', 'Ball Control', 'Shooting']
    },
    'RW': {
      description: 'A dynamic Right Winger combining pace with technical ability.',
      strengths: ['Dribbling', 'Speed', 'Crossing', 'Ball Control', 'Shooting']
    }
  };

  // Try to match the position with our defaults
  const normalizedPos = position.toUpperCase().trim();
  for (const [key, value] of Object.entries(positionMap)) {
    if (normalizedPos.includes(key)) {
      return value;
    }
  }

  // Return generic defaults if no specific position match is found
  return {
    description: 'A versatile player with good technical abilities and tactical understanding.',
    strengths: ['Technical Ability', 'Tactical Understanding', 'Team Work', 'Communication', 'Fitness']
  };
};

export default function PlayerProfileMaker() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile>({
    fullName: '',
    position: '',
    dateOfBirth: '',
    nationality: '',
    height: '',
    weight: '',
    preferredFoot: 'Right',
    phoneNumber: '',
    email: '',
    city: '',
    country: '',
    description: '',
    strengths: [],
    weaknesses: [],
    clubs: [{ name: '' }],
    profileImage: ''
  });
  const [generatedHTML, setGeneratedHTML] = useState<string | null>(null);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [entryMethod, setEntryMethod] = useState<'manual' | 'upload' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));

    // If position is changed, set default description and strengths
    if (name === 'position' && value) {
      const defaults = getPositionDefaults(value);
      
      // Only set defaults if description and strengths are empty
      setProfile(prev => ({
        ...prev,
        [name]: value,
        description: prev.description || defaults.description,
        strengths: prev.strengths.length === 0 ? defaults.strengths : prev.strengths
      }));

      // Trigger AI analysis if we have enough information
      if (value.trim()) {
        await analyzePlayerProfile();
      }
    }
  };

  const handleAddStrength = () => {
    setProfile(prev => ({
      ...prev,
      strengths: [...prev.strengths, '']
    }));
  };

  const handleStrengthChange = (index: number, value: string) => {
    const newStrengths = [...profile.strengths];
    newStrengths[index] = value;
    setProfile(prev => ({
      ...prev,
      strengths: newStrengths
    }));
  };

  const handleRemoveStrength = (index: number) => {
    setProfile(prev => ({
      ...prev,
      strengths: prev.strengths.filter((_, i) => i !== index)
    }));
  };

  const handleAddClub = () => {
    setProfile(prev => ({
      ...prev,
      clubs: [...prev.clubs, { name: '' }]
    }));
  };

  const handleClubChange = (index: number, value: string) => {
    const newClubs = [...profile.clubs];
    newClubs[index] = { ...newClubs[index], name: value };
    setProfile(prev => ({
      ...prev,
      clubs: newClubs
    }));
  };

  const handleRemoveClub = (index: number) => {
    setProfile(prev => ({
      ...prev,
      clubs: prev.clubs.filter((_, i) => i !== index)
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const result = event.target?.result;
        if (result) {
          setProfile(prev => ({
            ...prev,
            profileImage: result as string
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDataFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileUploadError(null);
    
    if (!file) return;
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'csv') {
      // Parse CSV file
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const result = event.target?.result;
        if (result && typeof result === 'string') {
          try {
            Papa.parse<Record<string, string>>(result, {
              header: true,
              complete: (results) => {
                if (results.data && results.data.length > 0) {
                  const playerData = results.data[0];
                  updateProfileFromData(playerData);
                } else {
                  setFileUploadError('No valid data found in the CSV file');
                }
              },
              error: (error: Error) => {
                setFileUploadError(`Error parsing CSV file: ${error.message}`);
              }
            });
          } catch (error) {
            setFileUploadError('Error reading CSV file');
          }
        }
      };
      reader.readAsText(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Parse Excel file
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        if (event.target && event.target.result) {
          try {
            const data = new Uint8Array(event.target.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Get the first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert sheet to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonData && jsonData.length > 0) {
              const playerData = jsonData[0] as Record<string, string>;
              updateProfileFromData(playerData);
            } else {
              setFileUploadError('No valid data found in the Excel file');
            }
          } catch (error) {
            setFileUploadError('Error reading Excel file');
          }
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setFileUploadError('Unsupported file format. Please upload a CSV or Excel file.');
    }
  };
  
  const updateProfileFromData = (data: Record<string, string>) => {
    // Map data fields to profile fields
    const updatedProfile = { ...profile };
    
    // Map known fields - using various possible key names to handle different file formats
    const fieldMappings = {
      // Common field names
      fullName: ['fullName', 'full_name', 'name', 'player_name', 'playerName'],
      position: ['position', 'player_position', 'playerPosition'],
      dateOfBirth: ['dateOfBirth', 'date_of_birth', 'birth_date', 'birthDate', 'dob'],
      nationality: ['nationality', 'country_of_birth', 'countryOfBirth'],
      height: ['height', 'player_height', 'heightCm'],
      weight: ['weight', 'player_weight', 'weightKg'],
      preferredFoot: ['preferredFoot', 'preferred_foot', 'foot', 'strongFoot'],
      phoneNumber: ['phoneNumber', 'phone_number', 'phone', 'contact', 'mobile'],
      email: ['email', 'email_address', 'emailAddress', 'contact_email'],
      city: ['city', 'player_city', 'residenceCity'],
      country: ['country', 'player_country', 'residenceCountry'],
      description: ['description', 'player_description', 'about', 'bio', 'playerBio'],
    };
    
    // Try to find and map each field
    for (const [profileKey, possibleKeys] of Object.entries(fieldMappings)) {
      for (const key of possibleKeys) {
        if (data[key] !== undefined) {
          (updatedProfile as any)[profileKey] = data[key];
          break;
        }
      }
    }
    
    // Handle strengths - could be a comma-separated string or individual fields
    if (data.strengths || data.player_strengths || data.skills) {
      const strengthsStr = data.strengths || data.player_strengths || data.skills;
      if (typeof strengthsStr === 'string') {
        const strengthsArray = strengthsStr.split(/,|;/).map(s => s.trim()).filter(Boolean);
        if (strengthsArray.length > 0) {
          updatedProfile.strengths = strengthsArray;
        }
      }
    }
    
    // Handle previous clubs - could be a comma-separated string
    if (data.clubs || data.previous_clubs || data.previousClubs) {
      const clubsStr = data.clubs || data.previous_clubs || data.previousClubs;
      if (typeof clubsStr === 'string') {
        const clubsArray = clubsStr.split(/,|;/).map(c => c.trim()).filter(Boolean);
        if (clubsArray.length > 0) {
          updatedProfile.clubs = clubsArray.map(name => ({ name }));
        }
      }
    }
    
    // Update the profile state
    setProfile(updatedProfile);
  };

  const generateProfile = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profile }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate profile');
      }
      
      const data = await response.json();
      setGeneratedHTML(data.html);
      setStep(3);
    } catch (error) {
      console.error('Error generating profile:', error);
      alert('Failed to generate profile. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAsPNG = async () => {
    if (!profileRef.current) return;
    
    const canvas = await html2canvas(profileRef.current);
    const dataUrl = canvas.toDataURL('image/png');
    
    const link = document.createElement('a');
    link.download = `${profile.fullName.replace(/\s+/g, '_')}_profile.png`;
    link.href = dataUrl;
    link.click();
  };

  const downloadAsPDF = async () => {
    if (!profileRef.current) return;
    
    const canvas = await html2canvas(profileRef.current);
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth * ratio, imgHeight * ratio);
    pdf.save(`${profile.fullName.replace(/\s+/g, '_')}_profile.pdf`);
  };

  const downloadSampleTemplate = () => {
    // Create a sample CSV template for users to fill in
    const csvContent = [
      // CSV headers
      [
        'fullName', 'position', 'dateOfBirth', 'nationality', 'height', 'weight', 
        'preferredFoot', 'phoneNumber', 'email', 'city', 'country', 
        'description', 'strengths', 'clubs'
      ].join(','),
      // Sample data row
      [
        'John Smith', 'Centre Midfielder', '1995-05-15', 'British', '180', '75',
        'Right', '+44 7700 900123', 'john.smith@example.com', 'London', 'United Kingdom',
        'Defensive midfielder with excellent passing ability', 'Passing, Vision, Energy, Commitment, Defensive',
        'Manchester United FC, Arsenal FC'
      ].join(',')
    ].join('\n');
    
    // Create a download link
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'player_profile_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const analyzePlayerProfile = async () => {
    if (!profile.position) return;
    
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          position: profile.position,
          description: profile.description || getPositionDefaults(profile.position).description,
          clubs: profile.clubs
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze profile');
      }
      
      const data = await response.json();
      setProfile(prev => ({
        ...prev,
        description: data.description || prev.description,
        strengths: data.strengths || prev.strengths,
        weaknesses: data.weaknesses || []
      }));
    } catch (error) {
      console.error('Error analyzing profile:', error);
      // Don't show alert here since this is automatic
    } finally {
      setIsAnalyzing(false);
    }
  };

  const retryWithBackoff = async (fn: () => Promise<any>, maxAttempts = 3) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxAttempts - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  };

  const exportProfile = async () => {
    return retryWithBackoff(async () => {
      const response = await fetch('/api/export-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profile }),
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
  
      // Get the PDF blob from the response
      const pdfBlob = await response.blob();
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(pdfBlob);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = url;
      link.download = `${profile.fullName || 'profile'}.pdf`;
      
      // Append to body, click, and cleanup
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
  
      return { success: true };
    });
  };
  
  const handleExport = async () => {
    try {
      setIsLoading(true);
      // Clean up profile data before sending
      const cleanProfile = {
        ...profile,
        // Remove potentially problematic data like large base64 images
        profileImage: profile.profileImage ? 'image data present' : undefined
      };

      const response = await fetch('/api/export-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profile: cleanProfile }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export profile');
      }

      // Handle successful PDF response
      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Generated PDF is empty');
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${profile.fullName.toLowerCase().replace(/\s+/g, '-')}-profile.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting profile:', error);
      alert(error instanceof Error ? error.message : 'Failed to export profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Player Profile Creator</h1>
      
      <div className="mb-8">
        <div className="flex justify-between">
          <div 
            className={`flex-1 py-2 px-4 text-center ${step === 0 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            1. Choose Method
          </div>
          <div 
            className={`flex-1 py-2 px-4 text-center ${step === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            2. Enter Information
          </div>
          <div 
            className={`flex-1 py-2 px-4 text-center ${step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            3. Review
          </div>
          <div 
            className={`flex-1 py-2 px-4 text-center ${step === 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            4. Generated Profile
          </div>
        </div>
      </div>
      
      {step === 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">How would you like to create your profile?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div 
              onClick={() => {
                setEntryMethod('upload');
                setStep(1);
              }}
              className="cursor-pointer p-6 border rounded-lg hover:border-blue-500 hover:shadow-lg transition-all"
            >
              <h3 className="text-lg font-semibold mb-2">Upload Data File</h3>
              <p className="text-gray-600">
                Import your player data from a CSV or Excel file. This is the fastest way if you already have your data prepared.
              </p>
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Choose File
              </button>
            </div>
            
            <div 
              onClick={() => {
                setEntryMethod('manual');
                setProfile({
                  ...profile,
                  strengths: [],
                  clubs: [{ name: '' }]
                });
                setStep(1);
              }}
              className="cursor-pointer p-6 border rounded-lg hover:border-blue-500 hover:shadow-lg transition-all"
            >
              <h3 className="text-lg font-semibold mb-2">Enter Manually</h3>
              <p className="text-gray-600">
                Fill out the profile form manually. Best if you want to create your profile from scratch.
              </p>
              <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Start Form
              </button>
            </div>
          </div>
        </div>
      )}
      
      {step === 1 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          {entryMethod === 'upload' ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">Import Player Data</h2>
              <p className="text-gray-600 mb-4">
                Upload your CSV or Excel file containing your player data.
              </p>
              
              <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                <div className="w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload Player Data File</label>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleDataFileUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Upload a CSV or Excel file with your player data
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 whitespace-nowrap"
                >
                  Download Template
                </button>
              </div>
              
              {fileUploadError && (
                <div className="p-3 mb-4 bg-red-100 text-red-700 rounded-md">
                  {fileUploadError}
                </div>
              )}

              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setStep(0);
                    setEntryMethod(null);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Back
                </button>
                
                <div className="space-x-4">
                  <button
                    type="button"
                    onClick={analyzePlayerProfile}
                    disabled={isAnalyzing || !profile.position}
                    className={`px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 ${
                      (isAnalyzing || !profile.position) ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Profile'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={profile.fullName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g. John Smith"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                  <input
                    type="text"
                    name="position"
                    value={profile.position}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g. Centre Midfielder"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={profile.dateOfBirth}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                  <input
                    type="text"
                    name="nationality"
                    value={profile.nationality}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g. British"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                  <input
                    type="text"
                    name="height"
                    value={profile.height}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g. 180"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="text"
                    name="weight"
                    value={profile.weight}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g. 75"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Foot</label>
                  <select
                    name="preferredFoot"
                    value={profile.preferredFoot}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="Right">Right</option>
                    <option value="Left">Left</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={profile.phoneNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g. +44 7700 900123"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={profile.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g. john.smith@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    name="city"
                    value={profile.city}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g. London"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={profile.country}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g. United Kingdom"
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Image</label>
                <div className="flex items-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  {profile.profileImage && (
                    <div className="ml-4 w-16 h-16 overflow-hidden rounded-full">
                      <img 
                        src={profile.profileImage} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Player Description</label>
                <textarea
                  name="description"
                  value={profile.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Describe your playing style, strengths, and characteristics..."
                ></textarea>
              </div>
              
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">Key Strengths</label>
                  <button 
                    type="button" 
                    onClick={handleAddStrength}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Strength
                  </button>
                </div>
                {profile.strengths.map((strength, index) => (
                  <div key={index} className="flex mb-2">
                    <input
                      type="text"
                      value={strength}
                      onChange={(e) => handleStrengthChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md"
                      placeholder="e.g. Passing"
                    />
                    <button 
                      type="button" 
                      onClick={() => handleRemoveStrength(index)}
                      className="px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-r-md"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">Previous Clubs</label>
                  <button 
                    type="button" 
                    onClick={handleAddClub}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Club
                  </button>
                </div>
                {profile.clubs.map((club, index) => (
                  <div key={index} className="flex mb-2">
                    <input
                      type="text"
                      value={club.name}
                      onChange={(e) => handleClubChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md"
                      placeholder="e.g. Manchester United FC"
                    />
                    <button 
                      type="button" 
                      onClick={() => handleRemoveClub(index)}
                      className="px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-r-md"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStep(0);
                    setEntryMethod(null);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Back
                </button>
                
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {step === 2 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Review Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="font-medium">Personal Details</h3>
              <p><span className="text-gray-600">Name:</span> {profile.fullName}</p>
              <p><span className="text-gray-600">Position:</span> {profile.position}</p>
              <p><span className="text-gray-600">Date of Birth:</span> {profile.dateOfBirth}</p>
              <p><span className="text-gray-600">Nationality:</span> {profile.nationality}</p>
              <p><span className="text-gray-600">Height:</span> {profile.height} cm</p>
              <p><span className="text-gray-600">Weight:</span> {profile.weight} kg</p>
              <p><span className="text-gray-600">Preferred Foot:</span> {profile.preferredFoot}</p>
            </div>
            
            <div>
              <h3 className="font-medium">Contact Information</h3>
              <p><span className="text-gray-600">Phone:</span> {profile.phoneNumber}</p>
              <p><span className="text-gray-600">Email:</span> {profile.email}</p>
              <p><span className="text-gray-600">City:</span> {profile.city}</p>
              <p><span className="text-gray-600">Country:</span> {profile.country}</p>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="font-medium">Profile Image</h3>
            {profile.profileImage ? (
              <div className="w-32 h-32 overflow-hidden rounded-full">
                <img 
                  src={profile.profileImage} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <p className="text-gray-600">No profile image uploaded</p>
            )}
          </div>
          
          <div className="mb-6">
            <h3 className="font-medium">Player Description</h3>
            <p className="text-gray-600">{profile.description || 'No description provided'}</p>
          </div>
          
          <div className="mb-6">
            <h3 className="font-medium">Key Strengths</h3>
            <ul className="list-disc list-inside">
              {profile.strengths.map((strength, index) => (
                <li key={index} className="text-gray-600">{strength}</li>
              ))}
            </ul>
          </div>
          
          <div className="mb-6">
            <h3 className="font-medium">Areas for Improvement</h3>
            <ul className="list-disc list-inside">
              {profile.weaknesses.map((weakness, index) => (
                <li key={index} className="text-gray-600">{weakness}</li>
              ))}
            </ul>
          </div>
          
          <div className="mb-6">
            <h3 className="font-medium">Previous Clubs</h3>
            <ul className="list-disc list-inside">
              {profile.clubs.map((club, index) => (
                <li key={index} className="text-gray-600">{club.name}</li>
              ))}
            </ul>
          </div>
          
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Back
            </button>
            
            <button
              type="button"
              onClick={generateProfile}
              disabled={isGenerating}
              className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${
                isGenerating ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isGenerating ? 'Generating...' : 'Generate Profile'}
            </button>
          </div>
        </div>
      )}
      
      {step === 3 && generatedHTML && (
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <h2 className="text-xl font-semibold mb-4">Your Player Profile</h2>
            
            <div className="mb-6">
              <div 
                ref={profileRef}
                className="border rounded-lg overflow-hidden"
                dangerouslySetInnerHTML={{ __html: generatedHTML }} 
              />
            </div>
            
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Back
              </button>
              
              <div className="space-x-4">
                <button
                  type="button"
                  onClick={downloadAsPNG}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Download as PNG
                </button>
                <button
                  type="button"
                  onClick={downloadAsPDF}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Download as PDF
                </button>
                <button
                  onClick={handleExport}
                  disabled={isLoading}
                  className={`px-4 py-2 bg-blue-600 text-white rounded ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                  }`}
                >
                  {isLoading ? 'Exporting...' : 'Export Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
