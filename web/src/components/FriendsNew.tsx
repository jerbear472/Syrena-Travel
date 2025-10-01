'use client';

import { useState, useEffect } from 'react';
import {
  Users, Search, UserPlus, Check, X, Clock,
  Send, UserCheck, UserX, Shield, ChevronRight, AlertCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase';

interface FriendsProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function Friends({ isSidebarOpen, onToggleSidebar }: FriendsProps) {
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [searchError, setSearchError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    loadFriendsData();
  }, []);

  const loadFriendsData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    // Load accepted friends
    const { data: friendsData } = await supabase
      .from('friendships')
      .select(`
        *,
        requester:requester_id(id, username, display_name, avatar_url),
        addressee:addressee_id(id, username, display_name, avatar_url)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted');

    // Load pending requests (where I'm the addressee)
    const { data: pendingData } = await supabase
      .from('friendships')
      .select(`
        *,
        requester:requester_id(id, username, display_name, avatar_url)
      `)
      .eq('addressee_id', user.id)
      .eq('status', 'pending');

    // Load sent requests (where I'm the requester)
    const { data: sentData } = await supabase
      .from('friendships')
      .select(`
        *,
        addressee:addressee_id(id, username, display_name, avatar_url)
      `)
      .eq('requester_id', user.id)
      .eq('status', 'pending');

    if (friendsData) {
      const formattedFriends = friendsData.map(f => {
        const friend = f.requester_id === user.id ? f.addressee : f.requester;
        return { ...f, friend };
      });
      setFriends(formattedFriends);
    }

    if (pendingData) setPendingRequests(pendingData);
    if (sentData) setSentRequests(sentData);

    setLoading(false);
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchError('');
      return;
    }

    console.log('Starting search for:', searchQuery);
    setSearchError('');

    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user:', user?.id);

    if (!user) {
      console.log('No user logged in');
      return;
    }

    // Try searching by username and display_name only (email might not be in profiles table)
    console.log('Executing query...');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
      .neq('id', user.id)
      .limit(50);

    console.log('Query result:', { data, error });

    if (error) {
      console.error('Search error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      console.error('Full error:', JSON.stringify(error, null, 2));
      setSearchError(`Database error: ${error.message || 'Unknown error'}. Check console for details.`);
      setSearchResults([]);
      return;
    }

    if (data) {
      // Mark users who are already friends or have pending requests
      const enhancedResults = await Promise.all(data.map(async (profile) => {
        const { data: friendship } = await supabase
          .from('friendships')
          .select('status')
          .or(`and(requester_id.eq.${user.id},addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.${user.id})`)
          .single();

        return { ...profile, friendship_status: friendship?.status };
      }));

      setSearchResults(enhancedResults);
    }
  };

  // Auto-search when query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'search') {
        searchUsers();
      }
    }, 300); // Debounce for 300ms

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  const sendFriendRequest = async (addresseeId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: user.id,
        addressee_id: addresseeId,
        status: 'pending'
      });

    if (!error) {
      await loadFriendsData();
      await searchUsers(); // Refresh search results
    }
  };

  const acceptRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', friendshipId);

    if (!error) {
      await loadFriendsData();
    }
  };

  const declineRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('id', friendshipId);

    if (!error) {
      await loadFriendsData();
    }
  };

  const removeFriend = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (!error) {
      await loadFriendsData();
    }
  };

  const tabs = [
    { id: 'friends', label: 'Friends', count: friends.length, icon: Users },
    { id: 'requests', label: 'Requests', count: pendingRequests.length, icon: Clock },
    { id: 'search', label: 'Find Friends', icon: Search }
  ];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <header className="header-clean border-b border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="heading-2">Friends</h1>
            <p className="text-caption mt-1">Connect and share places with friends</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon size={16} />
                <span className="font-medium">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="spinner-minimal mx-auto mb-4"></div>
              <p className="text-gray-500">Loading friends...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Friends Tab */}
            {activeTab === 'friends' && (
              <div className="space-y-3">
                {friends.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">No friends yet</h3>
                    <p className="text-gray-500 text-sm mb-4">
                      Start by searching for friends to share places with
                    </p>
                    <button
                      onClick={() => setActiveTab('search')}
                      className="btn-primary"
                    >
                      Find Friends
                    </button>
                  </div>
                ) : (
                  friends.map((friendship) => (
                    <div
                      key={friendship.id}
                      className="card-minimal p-4 flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-medium">
                          {friendship.friend.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {friendship.friend.display_name || friendship.friend.username}
                          </p>
                          <p className="text-xs text-gray-500">@{friendship.friend.username}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFriend(friendship.id)}
                        className="btn-icon opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-50"
                        aria-label="Remove friend"
                      >
                        <UserX size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <div className="space-y-6">
                {/* Pending Requests */}
                {pendingRequests.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-3">
                      Pending Requests ({pendingRequests.length})
                    </h3>
                    <div className="space-y-2">
                      {pendingRequests.map((request) => (
                        <div
                          key={request.id}
                          className="card-minimal p-4 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                              {request.requester.username?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {request.requester.display_name || request.requester.username}
                              </p>
                              <p className="text-xs text-gray-500">@{request.requester.username}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => acceptRequest(request.id)}
                              className="btn-icon bg-green-50 text-green-600 hover:bg-green-100"
                              aria-label="Accept"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => declineRequest(request.id)}
                              className="btn-icon bg-red-50 text-red-600 hover:bg-red-100"
                              aria-label="Decline"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sent Requests */}
                {sentRequests.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-3">
                      Sent Requests ({sentRequests.length})
                    </h3>
                    <div className="space-y-2">
                      {sentRequests.map((request) => (
                        <div
                          key={request.id}
                          className="card-minimal p-4 flex items-center justify-between opacity-75"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-medium">
                              {request.addressee.username?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {request.addressee.display_name || request.addressee.username}
                              </p>
                              <p className="text-xs text-gray-500">Waiting for response...</p>
                            </div>
                          </div>
                          <Clock size={16} className="text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pendingRequests.length === 0 && sentRequests.length === 0 && (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No pending requests</p>
                  </div>
                )}
              </div>
            )}

            {/* Search Tab */}
            {activeTab === 'search' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search by username or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                      className="input-clean pl-10 pr-4"
                    />
                  </div>
                  <button
                    onClick={searchUsers}
                    className="btn-primary px-6"
                    disabled={!searchQuery.trim()}
                  >
                    Search
                  </button>
                </div>

                {searchError && (
                  <div className="alert alert-error animate-slide-up">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{searchError}</span>
                  </div>
                )}

                {searchQuery && !searchError && searchResults.length === 0 && (
                  <p className="text-sm text-gray-500">
                    No results yet. Try searching...
                  </p>
                )}

                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="card-minimal p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-medium">
                          {user.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.display_name || user.username}
                          </p>
                          <p className="text-xs text-gray-500">@{user.username}</p>
                        </div>
                      </div>
                      <div>
                        {user.friendship_status === 'accepted' ? (
                          <span className="text-sm text-green-600 flex items-center gap-1">
                            <UserCheck size={16} />
                            Friends
                          </span>
                        ) : user.friendship_status === 'pending' ? (
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock size={16} />
                            Pending
                          </span>
                        ) : (
                          <button
                            onClick={() => sendFriendRequest(user.id)}
                            className="btn-primary btn-sm flex items-center gap-1"
                          >
                            <UserPlus size={14} />
                            Add Friend
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {searchQuery && searchResults.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No users found matching "{searchQuery}"</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}