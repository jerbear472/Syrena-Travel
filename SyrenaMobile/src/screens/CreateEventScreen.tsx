import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { theme } from '../theme';

interface CreateEventScreenProps {
  navigation: any;
  route: any;
}

const eventTypes = [
  { id: 'reservation', name: 'Reservation', icon: 'restaurant', description: 'Dinner, lunch, or drinks' },
  { id: 'concert', name: 'Concert', icon: 'music-note', description: 'Live music or show' },
  { id: 'travel', name: 'Travel', icon: 'flight', description: 'Trip or vacation' },
  { id: 'meetup', name: 'Meetup', icon: 'people', description: 'Casual hangout' },
  { id: 'visit', name: 'Visit', icon: 'place', description: 'Place to check out' },
  { id: 'other', name: 'Other', icon: 'star', description: 'Something else' },
];

const visibilityOptions = [
  { id: 'friends', name: 'Friends Only', icon: 'people', description: 'Only your friends can see' },
  { id: 'public', name: 'Public', icon: 'public', description: 'Anyone can see' },
  { id: 'private', name: 'Private', icon: 'lock', description: 'Only you and invited people' },
];

export default function CreateEventScreen({ navigation, route }: CreateEventScreenProps) {
  const { lat, lng, placeName } = route.params || {};

  const [title, setTitle] = useState(placeName || '');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [visibility, setVisibility] = useState('friends');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setEventDate(selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(eventDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setEventDate(newDate);
    }
  };

  const createEvent = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Missing Info', 'Please enter an event title');
      return;
    }
    if (!eventType) {
      Alert.alert('Missing Info', 'Please select an event type');
      return;
    }
    if (!lat || !lng) {
      Alert.alert('Missing Location', 'Please select a location on the map');
      return;
    }
    if (eventDate <= new Date()) {
      Alert.alert('Invalid Date', 'Please select a future date and time');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('future_events')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          event_type: eventType,
          event_date: eventDate.toISOString(),
          lat,
          lng,
          location_name: placeName || title.trim(),
          creator_id: user?.id,
          visibility,
          status: 'confirmed',
          max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Success!',
        'Your event has been created and your friends have been notified.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('[CreateEvent] Error creating event:', error);
      Alert.alert('Error', error.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="close" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Event</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Event Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="What's happening?"
            placeholderTextColor={theme.colors.textSubtle}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        {/* Event Type */}
        <View style={styles.section}>
          <Text style={styles.label}>Event Type *</Text>
          <View style={styles.typeGrid}>
            {eventTypes.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  eventType === type.id && styles.typeCardSelected,
                ]}
                onPress={() => setEventType(type.id)}
              >
                <Icon
                  name={type.icon}
                  size={32}
                  color={eventType === type.id ? theme.colors.accent : theme.colors.textTertiary}
                />
                <Text
                  style={[
                    styles.typeName,
                    eventType === type.id && styles.typeNameSelected,
                  ]}
                >
                  {type.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={styles.label}>Date & Time *</Text>

          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Icon name="event" size={24} color={theme.colors.accent} />
            <Text style={styles.dateTimeText}>{formatDate(eventDate)}</Text>
            <Icon name="chevron-right" size={24} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Icon name="access-time" size={24} color={theme.colors.accent} />
            <Text style={styles.dateTimeText}>{formatTime(eventDate)}</Text>
            <Icon name="chevron-right" size={24} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={eventDate}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={eventDate}
              mode="time"
              display="spinner"
              onChange={handleTimeChange}
            />
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add details about your event..."
            placeholderTextColor={theme.colors.textSubtle}
            value={description}
            onChangeText={setDescription}
            multiline
            scrollEnabled={false}
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        {/* Visibility */}
        <View style={styles.section}>
          <Text style={styles.label}>Who can see this?</Text>
          {visibilityOptions.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.visibilityOption,
                visibility === option.id && styles.visibilityOptionSelected,
              ]}
              onPress={() => setVisibility(option.id)}
            >
              <Icon
                name={option.icon}
                size={24}
                color={
                  visibility === option.id
                    ? theme.colors.accent
                    : theme.colors.textTertiary
                }
              />
              <View style={styles.visibilityInfo}>
                <Text
                  style={[
                    styles.visibilityName,
                    visibility === option.id && styles.visibilityNameSelected,
                  ]}
                >
                  {option.name}
                </Text>
                <Text style={styles.visibilityDescription}>{option.description}</Text>
              </View>
              {visibility === option.id && (
                <Icon name="check-circle" size={24} color={theme.colors.accent} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Max Attendees (Optional) */}
        <View style={styles.section}>
          <Text style={styles.label}>Max Attendees (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="No limit"
            placeholderTextColor={theme.colors.textSubtle}
            value={maxAttendees}
            onChangeText={setMaxAttendees}
            keyboardType="number-pad"
            maxLength={3}
          />
          <Text style={styles.hint}>Leave empty for unlimited attendees</Text>
        </View>

        {/* Location Info */}
        {placeName ? (
          <View style={styles.locationInfo}>
            <Icon name="place" size={24} color={theme.colors.accent} />
            <View style={styles.locationText}>
              <Text style={styles.locationName}>{placeName}</Text>
              <Text style={styles.locationCoords}>
                {lat?.toFixed(6)}, {lng?.toFixed(6)}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Create Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={createEvent}
          disabled={loading}
        >
          <Icon name="add-circle" size={24} color={theme.colors.textInverse} />
          <Text style={styles.createButtonText}>
            {loading ? 'Creating...' : 'Create Event'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
    fontFamily: theme.typography.fonts.heading.regular,
    color: theme.colors.primary,
    letterSpacing: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  section: {
    gap: theme.spacing.sm,
  },
  label: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textSecondary,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.input,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.base,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textPrimary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: theme.typography.sizes.xs,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textTertiary,
    textAlign: 'right',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  typeCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  typeCardSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSubtle,
  },
  typeName: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: '500',
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textSecondary,
  },
  typeNameSelected: {
    color: theme.colors.accent,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.input,
    padding: theme.spacing.md,
  },
  dateTimeText: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '500',
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textPrimary,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  visibilityOptionSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSubtle,
  },
  visibilityInfo: {
    flex: 1,
  },
  visibilityName: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textPrimary,
  },
  visibilityNameSelected: {
    color: theme.colors.accent,
  },
  visibilityDescription: {
    fontSize: theme.typography.sizes.xs,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textTertiary,
  },
  hint: {
    fontSize: theme.typography.sizes.xs,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.accentSubtle,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
  },
  locationText: {
    flex: 1,
  },
  locationName: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textPrimary,
  },
  locationCoords: {
    fontSize: theme.typography.sizes.xs,
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textSecondary,
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.button,
    paddingVertical: theme.spacing.md,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    fontFamily: theme.typography.fonts.body.regular,
    color: theme.colors.textInverse,
    letterSpacing: 0.5,
  },
});
