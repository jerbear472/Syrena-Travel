import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { supabase } from '../lib/supabase';
import theme from '../theme';

interface Friend {
  id: string;
  friend: {
    id: string;
    username: string;
    display_name?: string;
  };
}

interface PendingRequest {
  id: string;
  requester: {
    id: string;
    username: string;
    display_name?: string;
  };
}

export default function FriendsScreen() {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFriendsData();
  }, []);

  const loadFriendsData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load accepted friends
      const { data: friendsData } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:requester_id(id, username, display_name),
          addressee:addressee_id(id, username, display_name)
        `)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');

      // Load pending requests (received)
      const { data: pendingData } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:requester_id(id, username, display_name)
        `)
        .eq('addressee_id', user.id)
        .eq('status', 'pending');

      // Load sent requests
      const { data: sentData } = await supabase
        .from('friendships')
        .select(`
          *,
          addressee:addressee_id(id, username, display_name)
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

      if (pendingData) {
        setPendingRequests(pendingData);
      }

      if (sentData) {
        setSentRequests(sentData);
      }
    } catch (error: any) {
      console.error('Error loading friends:', error.message || String(error));
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .neq('id', user.id)
        .limit(10);

      setSearchResults(data || []);
    } catch (error: any) {
      console.error('Error searching users:', error.message || String(error));
    }
  };

  const sendFriendRequest = async (addresseeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('friendships')
        .insert({
          requester_id: user.id,
          addressee_id: addresseeId,
          status: 'pending',
        });

      if (error) throw error;
      Alert.alert('Success', 'Friend request sent!');
      loadFriendsData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const acceptRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;
      Alert.alert('Success', 'Friend request accepted!');
      loadFriendsData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const declineRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
      loadFriendsData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <View style={styles.userCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.friend.username?.[0]?.toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {item.friend.display_name || item.friend.username}
        </Text>
        <Text style={styles.userUsername}>@{item.friend.username}</Text>
      </View>
    </View>
  );

  const renderRequest = ({ item }: { item: PendingRequest }) => (
    <View style={styles.userCard}>
      <View style={[styles.avatar, styles.pendingAvatar]}>
        <Text style={styles.avatarText}>
          {item.requester.username?.[0]?.toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {item.requester.display_name || item.requester.username}
        </Text>
        <Text style={styles.userUsername}>@{item.requester.username}</Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => acceptRequest(item.id)}
        >
          <Icon name="check" size={18} color="#10B981" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.declineButton]}
          onPress={() => declineRequest(item.id)}
        >
          <Icon name="close" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchResult = ({ item }: { item: any }) => (
    <View style={styles.userCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.username?.[0]?.toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {item.display_name || item.username}
        </Text>
        <Text style={styles.userUsername}>@{item.username}</Text>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => sendFriendRequest(item.id)}
      >
        <Icon name="person-add" size={18} color="#FFF" />
        <Text style={styles.addButtonText}>Add</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <View style={styles.tabs}>
          {(['friends', 'requests', 'search'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === 'friends' && `Friends (${friends.length})`}
                {tab === 'requests' && `Requests (${pendingRequests.length + sentRequests.length})`}
                {tab === 'search' && 'Search'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {activeTab === 'search' && (
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={searchUsers}
          />
        </View>
      )}

      {activeTab === 'friends' && (
        <FlatList
          data={friends}
          renderItem={renderFriend}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No friends yet</Text>
          }
        />
      )}

      {activeTab === 'requests' && (
        <ScrollView contentContainerStyle={styles.listContent}>
          {/* Received Requests */}
          {pendingRequests.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Received ({pendingRequests.length})</Text>
              {pendingRequests.map((item) => (
                <View key={item.id}>
                  {renderRequest({ item })}
                </View>
              ))}
            </>
          )}

          {/* Sent Requests */}
          {sentRequests.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, pendingRequests.length > 0 && { marginTop: 20 }]}>
                Sent ({sentRequests.length})
              </Text>
              {sentRequests.map((item) => (
                <View key={item.id} style={styles.userCard}>
                  <View style={[styles.avatar, styles.pendingAvatar]}>
                    <Text style={styles.avatarText}>
                      {item.addressee.username?.[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {item.addressee.display_name || item.addressee.username}
                    </Text>
                    <Text style={styles.userUsername}>@{item.addressee.username}</Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Icon name="schedule" size={14} color="#6B7C85" />
                    <Text style={styles.pendingText}>Pending</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {pendingRequests.length === 0 && sentRequests.length === 0 && (
            <Text style={styles.emptyText}>No pending requests</Text>
          )}
        </ScrollView>
      )}

      {activeTab === 'search' && (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            searchQuery ? (
              <Text style={styles.emptyText}>No users found</Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.seaMist,
    backgroundColor: theme.colors.offWhite,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '600',
    color: theme.colors.midnightBlue,
    marginBottom: theme.spacing.lg,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.aquaMist,
    borderWidth: 2,
    borderColor: theme.colors.seaMist,
  },
  activeTab: {
    backgroundColor: theme.colors.midnightBlue,
    borderColor: theme.colors.midnightBlue,
  },
  tabText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.oceanGrey,
    fontWeight: '500',
  },
  activeTabText: {
    color: theme.colors.cream,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.seaMist,
    backgroundColor: theme.colors.offWhite,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.midnightBlue,
  },
  listContent: {
    padding: theme.spacing.xl,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.offWhite,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.seaMist,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.midnightBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.deepTeal,
  },
  pendingAvatar: {
    backgroundColor: theme.colors.seafoam,
    borderColor: theme.colors.sageBlue,
  },
  avatarText: {
    color: theme.colors.cream,
    fontWeight: '600',
    fontSize: theme.fontSize.md,
  },
  userInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  userName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.midnightBlue,
  },
  userUsername: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.oceanGrey,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#C8E6DC',
    borderWidth: 2,
    borderColor: '#A0D4C0',
  },
  declineButton: {
    backgroundColor: '#F5D6D6',
    borderWidth: 2,
    borderColor: '#E6B8B8',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.midnightBlue,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.lg,
    gap: 4,
  },
  addButtonText: {
    color: theme.colors.cream,
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.oceanGrey,
    fontSize: theme.fontSize.md,
    marginTop: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.midnightBlue,
    marginBottom: theme.spacing.md,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.aquaMist,
    borderWidth: 1,
    borderColor: theme.colors.stoneBlue,
  },
  pendingText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.oceanGrey,
    fontWeight: '500',
  },
});