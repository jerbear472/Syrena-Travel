'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Star, MessageCircle, CheckCircle2, User2, Calendar, Send, Heart, Navigation } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';

interface PlaceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  place: any;
  currentUser?: any;
  onPlaceUpdate?: () => void;
}

export default function PlaceDetailsModal({
  isOpen,
  onClose,
  place,
  currentUser,
  onPlaceUpdate
}: PlaceDetailsModalProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [hasVisited, setHasVisited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen && place) {
      loadPlaceData();
    }
  }, [isOpen, place]);

  const loadPlaceData = async () => {
    setLoading(true);

    try {
      // Check if current user is the owner
      const { data: { user } } = await supabase.auth.getUser();
      setIsOwner(user?.id === place.created_by);

      // Load comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('place_comments')
        .select('*, created_by')
        .eq('place_id', place.id)
        .order('created_at', { ascending: false });

      if (commentsError) {
        console.error('Error loading comments:', commentsError);
        // Table might not exist yet
        if (commentsError.code === '42P01') {
          console.log('Comments table does not exist. Please run the setup SQL.');
        }
      } else if (commentsData) {
        // Fetch user emails for comments
        const enrichedComments = await Promise.all(
          commentsData.map(async (comment) => {
            const { data: userData } = await supabase
              .from('auth.users')
              .select('email')
              .eq('id', comment.created_by)
              .single();
            return { ...comment, user: userData };
          })
        );
        setComments(enrichedComments);
      }

      // Load visits
      const { data: visitsData, error: visitsError } = await supabase
        .from('place_visits')
        .select('*')
        .eq('place_id', place.id);

      if (visitsError) {
        console.error('Error loading visits:', visitsError);
        console.error('Visits error details:', JSON.stringify(visitsError, null, 2));
        // Table might not exist yet
        if (visitsError.code === '42P01') {
          console.log('Visits table does not exist. Please run the setup SQL.');
        }
      } else if (visitsData) {
        // Fetch user emails for visits
        const enrichedVisits = await Promise.all(
          visitsData.map(async (visit) => {
            const { data: userData } = await supabase
              .from('profiles')
              .select('email, display_name, username')
              .eq('id', visit.visitor_id)
              .single();
            return { ...visit, user: userData };
          })
        );
        setVisits(enrichedVisits);
        // Check if current user has visited
        if (user) {
          setHasVisited(visitsData.some(v => v.visitor_id === user.id));
        }
      }
    } catch (error) {
      console.error('Error in loadPlaceData:', error);
    }

    setLoading(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Please sign in to add comments');
      return;
    }

    const { error } = await supabase
      .from('place_comments')
      .insert({
        place_id: place.id,
        comment: newComment,
        created_by: user.id
      });

    if (error) {
      console.error('Error adding comment:', error);
      if (error.code === '42P01') {
        alert('Comments feature is not set up yet. Please run the SQL setup in Supabase.');
      } else {
        alert('Failed to add comment. Please try again.');
      }
    } else {
      setNewComment('');
      loadPlaceData();
    }
  };

  const handleToggleVisit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Please sign in to mark visits');
      return;
    }

    let error;
    if (hasVisited) {
      // Remove visit
      const result = await supabase
        .from('place_visits')
        .delete()
        .eq('place_id', place.id)
        .eq('visitor_id', user.id);
      error = result.error;
    } else {
      // Add visit
      const result = await supabase
        .from('place_visits')
        .insert({
          place_id: place.id,
          visitor_id: user.id
        });
      error = result.error;
    }

    if (error) {
      console.error('Error toggling visit:', error);
      if (error.code === '42P01') {
        alert('Visit tracking is not set up yet. Please run the SQL setup in Supabase.');
      } else {
        alert('Failed to update visit status. Please try again.');
      }
    } else {
      loadPlaceData();
    }
  };

  if (!isOpen || !place) return null;

  // Get category icon background color
  const getCategoryColor = (category: string) => {
    const colors: any = {
      restaurant: 'bg-orange-100',
      cafe: 'bg-amber-100',
      coffee: 'bg-amber-100',
      viewpoint: 'bg-blue-100',
      nature: 'bg-green-100',
      shopping: 'bg-purple-100',
      hotel: 'bg-indigo-100',
      museum: 'bg-cyan-100',
      'hidden-gem': 'bg-pink-100',
      'people-watching': 'bg-teal-100',
      other: 'bg-gray-100',
    };
    return colors[category] || 'bg-gray-100';
  };

  return (
    <div className="fixed inset-0 modal-backdrop-clean z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="modal-clean w-full max-w-2xl max-h-[85vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="relative p-6 border-b border-gray-200">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 btn-icon"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 flex items-center justify-center">
              {place.profile?.odyssey_icon ? (
                <Image
                  src={`/avatars/${place.profile.odyssey_icon.replace('.png', '-circle.svg')}`}
                  alt="Creator icon"
                  width={48}
                  height={48}
                  className="object-contain"
                />
              ) : (
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getCategoryColor(place.category)}`}>
                  <MapPin size={24} className="text-gray-700" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="heading-2 mb-1">{place.name}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="capitalize">{place.category}</span>
                {place.rating > 0 && (
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < place.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                )}
                <span>Added {new Date(place.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {place.description && (
            <p className="text-body mt-4">{place.description}</p>
          )}
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} className="text-gray-500" />
              <span className="text-sm font-medium">{comments.length} Comments</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-gray-500" />
              <span className="text-sm font-medium">{visits.length} Visited</span>
            </div>
          </div>

          <button
            onClick={handleToggleVisit}
            className={`btn-secondary flex items-center gap-2 ${hasVisited ? 'bg-green-50 border-green-300 text-green-700' : ''}`}
          >
            <CheckCircle2 size={16} />
            <span>{hasVisited ? 'Visited' : 'Mark as Visited'}</span>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 280px)' }}>
          {/* Comments Section */}
          <div className="p-6">
            <h3 className="heading-3 mb-4">Comments</h3>

            {/* Add Comment */}
            <div className="flex gap-3 mb-6">
              <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                {currentUser?.email?.[0]?.toUpperCase() || 'U'}</div>
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder="Add a comment..."
                    className="input-clean flex-1"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="btn-primary px-4"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>

            {/* Comments List */}
            {loading ? (
              <div className="text-center py-8">
                <div className="spinner-minimal mx-auto"></div>
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No comments yet. Be the first to share your thoughts!
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-700 text-xs font-medium flex-shrink-0">
                      {comment.user?.email?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {comment.user?.email?.split('@')[0] || 'Anonymous'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Who Visited */}
            {visits.length > 0 && (
              <div className="mt-8">
                <h3 className="heading-3 mb-4">People Who Visited</h3>
                <div className="flex flex-wrap gap-2">
                  {visits.map((visit) => (
                    <div
                      key={visit.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm"
                    >
                      <CheckCircle2 size={14} className="text-green-600" />
                      <span>{visit.user?.email?.split('@')[0] || 'User'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {isOwner && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              You created this place • Coordinates: {place.lat}, {place.lng}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}