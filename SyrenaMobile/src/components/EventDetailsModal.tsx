import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { theme } from '../theme';

interface EventDetailsModalProps {
  event: {
    id: string;
    title: string;
    description?: string;
    event_date: string;
    event_type: string;
    timeframe: string;
    attendee_count: number;
    attendees: Array<{user_id: string; username: string; display_name?: string; status: string}>;
    creator_id: string;
  } | null;
  visible: boolean;
  onClose: () => void;
  onJoinEvent: (eventId: string) => void;
  currentUserId?: string;
}

const getEventIcon = (eventType: string): string => {
  const iconMap: {[key: string]: string} = {
    reservation: 'restaurant',
    concert: 'music-note',
    travel: 'flight',
    meetup: 'people',
    visit: 'place',
    other: 'star',
  };
  return iconMap[eventType] || 'star';
};

const getEventColor = (timeframe: string): string => {
  switch(timeframe) {
    case 'soon': return '#FFB800';
    case 'upcoming': return '#3B82F6';
    case 'future': return '#A855F7';
    default: return '#6B7280';
  }
};

const formatEventDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  const formattedDate = date.toLocaleDateString('en-US', dateOptions);
  const formattedTime = date.toLocaleTimeString('en-US', timeOptions);

  if (diffDays === 0) return `Today at ${formattedTime}`;
  if (diffDays === 1) return `Tomorrow at ${formattedTime}`;
  if (diffDays < 7) return `${formattedDate} at ${formattedTime}`;
  return `${formattedDate} at ${formattedTime}`;
};

export default function EventDetailsModal({
  event,
  visible,
  onClose,
  onJoinEvent,
  currentUserId,
}: EventDetailsModalProps) {
  if (!event) return null;

  const eventColor = getEventColor(event.timeframe);
  const isAttending = event.attendees.some(a => a.user_id === currentUserId && a.status === 'confirmed');
  const isCreator = event.creator_id === currentUserId;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: eventColor }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="close" size={28} color={theme.colors.offWhite} />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Icon name={getEventIcon(event.event_type)} size={64} color={theme.colors.offWhite} />
            <Text style={styles.timeframeBadge}>{event.timeframe.toUpperCase()}</Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Title */}
          <Text style={styles.title}>{event.title}</Text>

          {/* Date & Time */}
          <View style={styles.row}>
            <Icon name="event" size={24} color={theme.colors.oceanBlue} />
            <Text style={styles.dateText}>{formatEventDate(event.event_date)}</Text>
          </View>

          {/* Description */}
          {event.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{event.description}</Text>
            </View>
          )}

          {/* Attendees */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              👥 {event.attendee_count} {event.attendee_count === 1 ? 'Person' : 'People'} Going
            </Text>
            <View style={styles.attendeesList}>
              {event.attendees.map((attendee, index) => (
                <View key={attendee.user_id} style={styles.attendeeRow}>
                  <View style={styles.attendeeAvatar}>
                    <Icon name="person" size={20} color={theme.colors.midnightBlue} />
                  </View>
                  <Text style={styles.attendeeName}>
                    {attendee.display_name || attendee.username}
                    {attendee.user_id === event.creator_id && (
                      <Text style={styles.creatorBadge}> (Host)</Text>
                    )}
                  </Text>
                  {attendee.status === 'confirmed' && (
                    <Icon name="check-circle" size={18} color={theme.colors.success} />
                  )}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        {!isCreator && (
          <View style={styles.footer}>
            {isAttending ? (
              <View style={styles.attendingContainer}>
                <Icon name="check-circle" size={24} color={theme.colors.success} />
                <Text style={styles.attendingText}>You're going!</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.joinButton, { backgroundColor: eventColor }]}
                onPress={() => {
                  onJoinEvent(event.id);
                  Alert.alert('Success', 'You joined the event!');
                }}
              >
                <Icon name="person-add" size={24} color={theme.colors.offWhite} />
                <Text style={styles.joinButtonText}>Join Event</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.notifyButton}>
              <Icon name="notifications" size={24} color={theme.colors.midnightBlue} />
              <Text style={styles.notifyButtonText}>Remind Me</Text>
            </TouchableOpacity>
          </View>
        )}

        {isCreator && (
          <View style={styles.footer}>
            <View style={styles.creatorFooter}>
              <Icon name="star" size={24} color={theme.colors.coral} />
              <Text style={styles.creatorText}>You created this event</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: theme.spacing.lg,
    zIndex: 10,
  },
  headerContent: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  timeframeBadge: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    fontFamily: theme.fonts.sans.regular,
    color: theme.colors.offWhite,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.xl,
    gap: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: '700',
    fontFamily: theme.fonts.serif.bold,
    color: theme.colors.midnightBlue,
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  dateText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    fontFamily: theme.fonts.sans.regular,
    color: theme.colors.midnightBlue,
  },
  section: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    fontFamily: theme.fonts.sans.regular,
    color: theme.colors.midnightBlue,
  },
  description: {
    fontSize: theme.fontSize.md,
    fontFamily: theme.fonts.sans.regular,
    color: theme.colors.oceanGrey,
    lineHeight: 24,
  },
  attendeesList: {
    gap: theme.spacing.sm,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.offWhite,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.seaMist,
  },
  attendeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeName: {
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    fontFamily: theme.fonts.sans.regular,
    color: theme.colors.midnightBlue,
  },
  creatorBadge: {
    fontSize: theme.fontSize.sm,
    fontWeight: '400',
    color: theme.colors.coral,
  },
  footer: {
    padding: theme.spacing.xl,
    borderTopWidth: 2,
    borderTopColor: theme.colors.seaMist,
    backgroundColor: theme.colors.offWhite,
    gap: theme.spacing.md,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  joinButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    fontFamily: theme.fonts.sans.regular,
    color: theme.colors.offWhite,
  },
  notifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.cream,
    borderWidth: 2,
    borderColor: theme.colors.midnightBlue,
  },
  notifyButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    fontFamily: theme.fonts.sans.regular,
    color: theme.colors.midnightBlue,
  },
  attendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.cream,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.success,
  },
  attendingText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    fontFamily: theme.fonts.sans.regular,
    color: theme.colors.success,
  },
  creatorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
  },
  creatorText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    fontFamily: theme.fonts.sans.regular,
    color: theme.colors.coral,
  },
});
