'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Star, MessageCircle, CheckCircle2, User2, Calendar, Send, Heart, Navigation, Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { categoryMeta } from '@/lib/categories';
import Image from 'next/image';
import EditPlaceModal from '@/components/EditPlaceModal';

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      setIsOwner(user?.id === place.user_id);

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
        // Resolve commenter names from profiles (auth.users is not
        // queryable from the browser client)
        const enrichedComments = await Promise.all(
          commentsData.map(async (comment) => {
            const { data: userData } = await supabase
              .from('profiles')
              .select('display_name, username, email')
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
        console.error('Error loading visits:', visitsError.code);
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

  const handleDeletePlace = async () => {
    if (!window.confirm(`Delete "${place.name}" from your places? This can't be undone.`)) return;
    setDeleting(true);
    const { error } = await supabase
      .from('places')
      .delete()
      .eq('id', place.id);
    setDeleting(false);

    if (error) {
      console.error('Error deleting place:', error);
      alert('Failed to delete place. Please try again.');
    } else {
      onPlaceUpdate?.();
      onClose();
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

  const catMeta = categoryMeta(place.category);
  const CatIcon = catMeta.Icon;

  return (
    <div className="fixed inset-0 modal-backdrop-clean z-50 flex items-center justify-center p-4">
      <div className="modal-clean w-full max-w-2xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="relative p-6 border-b-2 border-sea-mist">
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
                  src={`/avatars/${place.profile.odyssey_icon.includes('-circle.png') ? place.profile.odyssey_icon : place.profile.odyssey_icon.replace('.png', '-circle.png')}`}
                  alt="Creator icon"
                  width={48}
                  height={48}
                  className="object-contain"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: catMeta.subtle }}>
                  <CatIcon size={24} style={{ color: catMeta.color }} />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="heading-2 mb-1">{place.name}</h2>
              <div className="flex items-center gap-4 text-sm text-ocean-grey">
                <span className="capitalize">{place.category}</span>
                {place.rating > 0 && (
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < Math.round(place.rating) ? 'text-siren-gold fill-siren-gold' : 'text-sea-mist'}
                      />
                    ))}
                    <span className="text-xs text-ocean-grey ml-1">{Number(place.rating).toFixed(1)}</span>
                  </div>
                )}
                {place.created_at && <span>Added {new Date(place.created_at).toLocaleDateString()}</span>}
              </div>
            </div>
          </div>

          {place.description && (
            <p className="text-body mt-4">{place.description}</p>
          )}
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between p-4 bg-cream/60 border-b-2 border-sea-mist">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} className="text-ocean-grey" />
              <span className="text-sm font-medium">{comments.length} Comments</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-ocean-grey" />
              <span className="text-sm font-medium">{visits.length} Visited</span>
            </div>
          </div>

          <button
            onClick={handleToggleVisit}
            className={`btn-secondary flex items-center gap-2 ${hasVisited ? 'bg-success-subtle border-success/40 text-success' : ''}`}
          >
            <CheckCircle2 size={16} />
            <span>{hasVisited ? 'Visited' : 'Mark as Visited'}</span>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto" style={{ maxHeight: 'max(200px, calc(85vh - 280px))' }}>
          {/* Comments Section */}
          <div className="p-6">
            <h3 className="heading-3 mb-4">Comments</h3>

            {/* Add Comment */}
            <div className="flex gap-3 mb-6">
              <div className="w-8 h-8 bg-midnight-blue rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
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
              <p className="text-center text-ocean-grey py-8">
                No comments yet. Be the first to share your thoughts!
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => {
                  const commenterName = comment.user?.display_name || comment.user?.username || comment.user?.email?.split('@')[0] || 'Anonymous';
                  return (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 bg-sea-mist rounded-full flex items-center justify-center text-ocean-depth text-xs font-medium flex-shrink-0">
                      {commenterName[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-midnight-blue">
                          {commenterName}
                        </span>
                        <span className="text-xs text-ocean-grey">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-ocean-depth">{comment.comment}</p>
                    </div>
                  </div>
                  );
                })}
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
                      className="flex items-center gap-2 px-3 py-1.5 bg-sea-mist rounded-full text-sm"
                    >
                      <CheckCircle2 size={14} className="text-success" />
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
          <div className="p-4 border-t-2 border-sea-mist bg-cream/60 flex items-center justify-between gap-3">
            <p className="text-xs text-ocean-grey">
              You created this place • {Number(place.lat).toFixed(4)}, {Number(place.lng).toFixed(4)}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="btn-secondary flex items-center gap-1.5 text-sm px-3 py-1.5"
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                onClick={handleDeletePlace}
                disabled={deleting}
                className="btn-secondary flex items-center gap-1.5 text-sm px-3 py-1.5 text-error border-error/30 hover:bg-error-subtle disabled:opacity-50"
              >
                <Trash2 size={14} />
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </div>

      {showEditModal && (
        <EditPlaceModal
          place={place}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            onPlaceUpdate?.();
            onClose();
          }}
        />
      )}
    </div>
  );
}