'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface PlayerProfile {
  name: string;
  position: string;
  team: string;
  age: string;
  height: string;
  weight: string;
  nationality: string;
  jerseyNumber: string;
  imageUrl: string;
  strengths: string[];
  weaknesses: string[];
  description: string;
}

export default function ProfileMakerPage() {
  const [profile, setProfile] = useState<PlayerProfile>({
    name: '',
    position: '',
    team: '',
    age: '',
    height: '',
    weight: '',
    nationality: '',
    jerseyNumber: '',
    imageUrl: '',
    strengths: ['', '', '', '', ''],
    weaknesses: ['', '', '', '', ''],
    description: ''
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  const [editMode, setEditMode] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const generateProfileContent = async () => {
    if (!profile.name || !profile.position) {
      setMessage({
        text: 'Please enter player name and position first',
        type: 'error'
      });
      return;
    }

    setIsGenerating(true);
    setMessage(null);

    try {
      const response = await fetch('/api/generate-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profile.name,
          position: profile.position,
          team: profile.team
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(prev => ({
          ...prev,
          strengths: data.strengths,
          weaknesses: data.weaknesses,
          description: data.description
        }));
        setMessage({
          text: 'Profile content generated successfully! You can now edit if needed.',
          type: 'success'
        });
      } else {
        throw new Error('Failed to generate profile content');
      }
    } catch (error) {
      console.error('Error generating profile:', error);
      setMessage({
        text: 'Failed to generate profile content',
        type: 'error'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const exportProfile = async (format: 'png' | 'pdf') => {
    setIsExporting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/export-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile,
          format
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to export profile');
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      
      if (contentType === 'text/html') {
        // In development mode, we get HTML content directly
        const html = await response.text();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setMessage({
          text: 'Profile opened in new tab. Please use browser print function to save as PDF.',
          type: 'success'
        });
        return;
      }

      // For production or direct PDF response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${profile.name.toLowerCase().replace(/\s+/g, '-')}-profile.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setMessage({
        text: `Profile exported successfully as ${format.toUpperCase()}`,
        type: 'success'
      });
    } catch (error: any) {
      console.error('Error exporting profile:', error);
      setMessage({
        text: error.message || 'Failed to export profile',
        type: 'error'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const updateStrength = (index: number, value: string) => {
    const newStrengths = [...profile.strengths];
    newStrengths[index] = value;
    setProfile({...profile, strengths: newStrengths});
  };

  const updateWeakness = (index: number, value: string) => {
    const newWeaknesses = [...profile.weaknesses];
    newWeaknesses[index] = value;
    setProfile({...profile, weaknesses: newWeaknesses});
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Player Profile Maker</h1>
          <Link href="/football" className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100">
            Back to Analysis
          </Link>
        </div>

        {message && (
          <div className={`p-4 mb-6 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Player Information</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-1">Player Photo</label>
                <div className="flex items-center space-x-4">
                  {profile.imageUrl ? (
                    <div className="relative w-32 h-32">
                      <Image
                        src={profile.imageUrl}
                        alt="Player"
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400">No image</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="imageUpload"
                  />
                  <label
                    htmlFor="imageUpload"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
                  >
                    Upload Photo
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Player name"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Position</label>
                  <select
                    value={profile.position}
                    onChange={(e) => setProfile({...profile, position: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select position</option>
                    <option value="Goalkeeper">Goalkeeper</option>
                    <option value="Defender">Defender</option>
                    <option value="Midfielder">Midfielder</option>
                    <option value="Forward">Forward</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-1">Team</label>
                  <input
                    type="text"
                    value={profile.team}
                    onChange={(e) => setProfile({...profile, team: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Team name"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Nationality</label>
                  <input
                    type="text"
                    value={profile.nationality}
                    onChange={(e) => setProfile({...profile, nationality: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Nationality"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={profile.age}
                    onChange={(e) => setProfile({...profile, age: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Age"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    value={profile.height}
                    onChange={(e) => setProfile({...profile, height: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Height"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={profile.weight}
                    onChange={(e) => setProfile({...profile, weight: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Weight"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-1">Jersey Number</label>
                <input
                  type="number"
                  value={profile.jerseyNumber}
                  onChange={(e) => setProfile({...profile, jerseyNumber: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Jersey number"
                />
              </div>

              <button
                type="button"
                onClick={generateProfileContent}
                disabled={isGenerating}
                className={`w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${isGenerating ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isGenerating ? 'Generating...' : 'Generate Profile Content'}
              </button>
            </form>
          </div>

          {/* Generated Content */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Profile Content</h2>
              <button 
                onClick={() => setEditMode(!editMode)}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                {editMode ? 'View Mode' : 'Edit Mode'}
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Description</h3>
                {editMode ? (
                  <textarea
                    value={profile.description}
                    onChange={(e) => setProfile({...profile, description: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[100px]"
                    placeholder="Enter player description"
                  />
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap">{profile.description || 'No description generated yet.'}</p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Strengths</h3>
                {editMode ? (
                  <div className="space-y-2">
                    {profile.strengths.map((strength, index) => (
                      <input
                        key={index}
                        type="text"
                        value={strength}
                        onChange={(e) => updateStrength(index, e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder={`Strength ${index + 1}`}
                      />
                    ))}
                  </div>
                ) : (
                  <ul className="list-disc list-inside space-y-1">
                    {profile.strengths.filter(s => s.trim() !== '').map((strength, index) => (
                      <li key={index} className="text-gray-700">{strength}</li>
                    ))}
                    {profile.strengths.filter(s => s.trim() !== '').length === 0 && (
                      <li className="text-gray-500">No strengths generated yet.</li>
                    )}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Areas for Improvement</h3>
                {editMode ? (
                  <div className="space-y-2">
                    {profile.weaknesses.map((weakness, index) => (
                      <input
                        key={index}
                        type="text"
                        value={weakness}
                        onChange={(e) => updateWeakness(index, e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder={`Area for improvement ${index + 1}`}
                      />
                    ))}
                  </div>
                ) : (
                  <ul className="list-disc list-inside space-y-1">
                    {profile.weaknesses.filter(w => w.trim() !== '').map((weakness, index) => (
                      <li key={index} className="text-gray-700">{weakness}</li>
                    ))}
                    {profile.weaknesses.filter(w => w.trim() !== '').length === 0 && (
                      <li className="text-gray-500">No areas for improvement generated yet.</li>
                    )}
                  </ul>
                )}
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => exportProfile('png')}
                  disabled={isExporting || !profile.description}
                  className={`flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 ${(isExporting || !profile.description) ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isExporting ? 'Exporting...' : 'Export as PNG'}
                </button>
                <button
                  onClick={() => exportProfile('pdf')}
                  disabled={isExporting || !profile.description}
                  className={`flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 ${(isExporting || !profile.description) ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isExporting ? 'Exporting...' : 'Export as PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 