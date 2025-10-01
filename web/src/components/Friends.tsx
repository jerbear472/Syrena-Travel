'use client';

import { useState } from 'react';
import {
  UserPlus, Search, MoreVertical, MapPin, Check, X, Users,
  Mail, Globe, Calendar, Award, Menu
} from 'lucide-react';

interface FriendsProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function Friends({ isSidebarOpen, onToggleSidebar }: FriendsProps) {
  const [friends, setFriends] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeTab, setActiveTab] = useState('friends');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');

  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const pendingRequests = friends.filter(f => f.status === 'pending');

  const handleAcceptRequest = (friendId: string) => {
    setFriends(friends.map(f =>
      f.id === friendId ? { ...f, status: 'accepted' } : f
    ));
  };

  const handleRejectRequest = (friendId: string) => {
    setFriends(friends.filter(f => f.id !== friendId));
  };

  const handleSendInvite = () => {
    // Handle invite logic here
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteMessage('');
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <header className="header-clean border-b border-gray-200">
        {/* Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="heading-2">
              Travel Network
            </h1>
            <p className="text-caption mt-1">
              Share discoveries and plan adventures together
            </p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <UserPlus size={18} />
            <span>Add Friend</span>
          </button>
        </div>

        {/* Tabs and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('friends')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'friends'
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Friends
              {acceptedFriends.length > 0 && (
                <span className="ml-1.5 text-xs opacity-80">
                  ({acceptedFriends.length})
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all relative ${
                activeTab === 'requests'
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Requests
              {pendingRequests.length > 0 && (
                <span className="ml-1.5 badge badge-primary">
                  {pendingRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'discover'
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Discover
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-clean pl-10 pr-3 w-full sm:w-48"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gray-50">
        {activeTab === 'friends' && (
          <>
            {acceptedFriends.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {acceptedFriends.map(friend => (
                  <article
                    key={friend.id}
                    className="card-minimal animate-fade-in"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center text-white font-medium">
                          {friend.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {friend.name}
                          </h3>
                          <p className="text-xs text-gray-500">
                            @{friend.username}
                          </p>
                        </div>
                      </div>
                      <button className="btn-icon">
                        <MoreVertical size={16} />
                      </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="text-center p-2 bg-gray-50 rounded-md">
                        <p className="text-lg font-semibold text-gray-900">0</p>
                        <p className="text-xs text-gray-600">Places</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-md">
                        <p className="text-lg font-semibold text-gray-900">0</p>
                        <p className="text-xs text-gray-600">Shared</p>
                      </div>
                    </div>

                    {/* Location */}
                    {friend.location && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                        <MapPin size={14} className="text-gray-400" />
                        <span>{friend.location}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <button className="w-full btn-secondary">
                      View Places
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto animate-fade-in">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                  <Users size={32} className="text-gray-400" />
                </div>
                <h3 className="heading-3 mb-3">
                  Build Your Travel Network
                </h3>
                <p className="text-body mb-6">
                  Connect with friends to share your favorite spots, get personalized
                  recommendations, and discover hidden gems through trusted connections.
                </p>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="btn-primary"
                >
                  Invite Your First Friend
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'requests' && (
          <div className="max-w-4xl mx-auto">
            {pendingRequests.length > 0 ? (
              <div className="space-y-4">
                {pendingRequests.map(request => (
                  <div key={request.id} className="card-minimal animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center text-white text-xl font-medium">
                          {request.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-medium text-lg text-gray-900">
                            {request.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            @{request.username}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              12 places
                            </span>
                            <span className="flex items-center gap-1">
                              <Users size={12} />
                              5 mutual friends
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleAcceptRequest(request.id)}
                          className="btn-primary flex items-center gap-2"
                        >
                          <Check size={18} />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id)}
                          className="btn-secondary"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 animate-fade-in">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="heading-3 mb-3">
                  No pending requests
                </h3>
                <p className="text-body">
                  Friend requests will appear here when you receive them
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'discover' && (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Globe className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="heading-3 mb-3">
              Discover new friends
            </h3>
            <p className="text-body">
              Friend suggestions will appear here once available
            </p>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 modal-backdrop-clean z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="modal-clean w-full max-w-lg animate-scale-in">
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="heading-2">Add Friend</h2>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="btn-icon"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-label block mb-2">
                    Email or Username
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="text"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="friend@example.com or @username"
                      className="input-clean pl-11"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-label block mb-2">
                    Message <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="Add a personal message..."
                    rows={4}
                    className="input-clean resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendInvite}
                    className="flex-1 btn-primary"
                  >
                    Send Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}