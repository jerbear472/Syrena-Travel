'use client';

import { useState, useEffect } from 'react';
import { Search, UserPlus, Users, Check, Clock, X } from 'lucide-react';

interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  friendship_status: string | null;
}

interface UserSearchProps {
  onRequestSent?: () => void;
}

export default function UserSearch({ onRequestSent }: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);

  const searchUsers = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (response.ok) {
        setSearchResults(data.users || []);
      } else {
        console.error('Search failed:', data.error);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search with useEffect
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSendRequest = async (userId: string) => {
    setSendingRequest(userId);
    try {
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressee_id: userId })
      });

      const data = await response.json();

      if (response.ok) {
        // Update the local state to reflect the sent request
        setSearchResults(prev =>
          prev.map(user =>
            user.id === userId
              ? { ...user, friendship_status: 'pending' }
              : user
          )
        );
        onRequestSent?.();
      } else {
        alert(data.error || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Failed to send friend request');
    } finally {
      setSendingRequest(null);
    }
  };

  const getStatusButton = (user: User) => {
    if (user.friendship_status === 'accepted') {
      return (
        <button
          disabled
          className="btn-secondary opacity-50 cursor-not-allowed flex items-center gap-2"
        >
          <Check size={16} />
          <span>Friends</span>
        </button>
      );
    }

    if (user.friendship_status === 'pending') {
      return (
        <button
          disabled
          className="btn-secondary opacity-50 cursor-not-allowed flex items-center gap-2"
        >
          <Clock size={16} />
          <span>Pending</span>
        </button>
      );
    }

    return (
      <button
        onClick={() => handleSendRequest(user.id)}
        disabled={sendingRequest === user.id}
        className="btn-primary flex items-center gap-2"
      >
        <UserPlus size={16} />
        <span>{sendingRequest === user.id ? 'Sending...' : 'Add Friend'}</span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Search by username or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-clean pl-11 pr-3"
        />
      </div>

      {/* Search Results */}
      {searchQuery.trim().length >= 2 && (
        <div className="space-y-3">
          {isSearching ? (
            <div className="text-center py-8">
              <div className="spinner-minimal mx-auto"></div>
              <p className="text-sm text-gray-500 mt-3">Searching...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-3">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="card-minimal animate-fade-in"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center text-white font-medium flex-shrink-0">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.display_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          user.display_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {user.display_name || user.username}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                          @{user.username}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusButton(user)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 animate-fade-in">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="heading-3 mb-2">No users found</h3>
              <p className="text-body">
                Try searching with a different username or name
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {searchQuery.trim().length < 2 && (
        <div className="text-center py-12 animate-fade-in">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="heading-3 mb-2">Search for friends</h3>
          <p className="text-body">
            Enter a username or name to find and connect with friends
          </p>
        </div>
      )}
    </div>
  );
}
