'use client';

import { useState, useEffect, useRef } from 'react';
import { User, Camera, Save, ArrowLeft, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';

interface ProfileSettingsProps {
  onBack: () => void;
}

const ODYSSEY_ICONS = [
  'odyssey-1.png', 'odyssey-2.png', 'odyssey-3.png',
  'odyssey-4.png', 'odyssey-5.png', 'odyssey-6.png',
  'odyssey-7.png', 'odyssey-8.png', 'odyssey-9.png',
  'odyssey-10.png', 'odyssey-11.png', 'odyssey-12.png'
];

export default function ProfileSettings({ onBack }: ProfileSettingsProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [odysseyIcon, setOdysseyIcon] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setProfile(profile);
          setDisplayName(profile.display_name || '');
          setUsername(profile.username || '');
          setAvatarUrl(profile.avatar_url);
          setOdysseyIcon(profile.odyssey_icon || null);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Delete old avatar if exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      // Upload new avatar
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      alert('Profile picture updated!');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      alert(`Error uploading image: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          username: username,
          odyssey_icon: odysseyIcon
        })
        .eq('id', user.id);

      if (error) throw error;

      alert('Profile updated successfully!');
      loadProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert(`Error updating profile: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="spinner-minimal mx-auto mb-4"></div>
          <p className="text-ocean-grey font-serif">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-cream">
      {/* Header */}
      <header className="header-clean border-b-2 border-sand">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="btn-icon"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="heading-2">Profile Settings</h1>
            <p className="text-caption">Manage your profile information</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Picture Section */}
          <div className="card-minimal p-6">
            <h2 className="font-serif font-semibold text-earth-brown mb-4 text-lg">
              Profile Picture
            </h2>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-midnight-blue flex items-center justify-center text-cream border-4 border-stone-blue">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Profile"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={40} />
                  )}
                </div>
                <button
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-deep-teal text-cream rounded-full flex items-center justify-center hover:bg-ocean-depth transition-colors border-2 border-cream shadow-rustic-md"
                  aria-label="Change profile picture"
                >
                  {uploading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Camera size={16} />
                  )}
                </button>
              </div>
              <div className="flex-1">
                <h3 className="font-serif font-medium text-midnight-blue mb-1">
                  Upload Photo
                </h3>
                <p className="text-sm text-ocean-grey mb-2">
                  JPG, PNG or GIF. Max size 5MB.
                </p>
                <button
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  className="btn-secondary text-sm"
                >
                  {uploading ? 'Uploading...' : 'Choose File'}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Odyssey Icon Selection */}
          <div className="card-minimal p-6">
            <h2 className="font-serif font-semibold text-earth-brown mb-4 text-lg">
              Map Pin Icon
            </h2>
            <p className="text-sm text-ocean-grey mb-4">
              Choose an Odyssey-themed icon that will appear as your map pin
            </p>
            <div className="grid grid-cols-4 gap-3">
              {ODYSSEY_ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setOdysseyIcon(icon)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-4 transition-all hover:scale-105 ${
                    odysseyIcon === icon
                      ? 'border-deep-teal shadow-rustic-lg'
                      : 'border-warm-stone hover:border-stone-blue'
                  }`}
                  style={{ backgroundColor: '#2c3e50' }}
                >
                  <Image
                    src={`/avatars/${icon}`}
                    alt={`Odyssey icon ${icon}`}
                    width={200}
                    height={200}
                    className="w-full h-full object-cover"
                    style={{ filter: 'brightness(1.2) contrast(0.95)' }}
                  />
                  {odysseyIcon === icon && (
                    <div className="absolute inset-0 bg-deep-teal/20 flex items-center justify-center">
                      <div className="w-8 h-8 bg-deep-teal rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-cream" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Profile Information Section */}
          <div className="card-minimal p-6">
            <h2 className="font-serif font-semibold text-earth-brown mb-4 text-lg">
              Profile Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-serif font-medium text-midnight-blue mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  className="input-clean w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-serif font-medium text-midnight-blue mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your username"
                  className="input-clean w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-serif font-medium text-midnight-blue mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={profile?.id ? (profile.id.substring(0, 8) + '@user') : ''}
                  disabled
                  className="input-clean w-full opacity-50 cursor-not-allowed"
                />
                <p className="text-xs text-ocean-grey mt-1">
                  Email cannot be changed
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
