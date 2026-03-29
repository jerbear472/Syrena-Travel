# Future Events System - Implementation Plan

## Overview
Add dynamic, forward-looking event indicators to the map showing where friends are planning to go. Events pulse and glow based on proximity in time, creating a living map of your social network's future.

## Visual Design Specification

### Color-Coded Timeframes
```
🟡 SOON (Next 7 days)      - Gold/amber pulsing glow
🔵 UPCOMING (1-4 weeks)    - Blue shimmering effect
🟣 FUTURE (1+ months)      - Purple subtle fade
⚫ PAST                     - Grayed out (optional: show for memory)
```

### Map Marker Design
- **Base**: Circular icon with event type symbol
- **Animation**: Continuous subtle pulse (scale 1.0 → 1.15 → 1.0, 2s duration)
- **Glow**: Outer ring matching timeframe color
- **Badge**: Small number showing attendee count (bottom-right)
- **Cluster**: When multiple events at same location, stack with offset

### Event Type Icons
```
🍽️  reservation   - Restaurant/fork-knife icon
🎵  concert       - Music note icon
✈️  travel        - Airplane icon
🤝  meetup        - Handshake icon
📍  visit         - Pin icon
🎉  other         - Star icon
```

## Database Schema

### Tables Created
1. **future_events** - Core event data
   - id, place_id, creator_id, event_date, event_type
   - title, description, status, visibility
   - lat, lng, location_name

2. **event_attendees** - Who's going
   - event_id, user_id, status (confirmed/pending/declined)

### Key Features
- RLS policies: Only see events from friends (respects privacy)
- Automatic notifications when friends create events
- Auto-add creator as first attendee
- Timeframe calculation function (soon/upcoming/future)

## Mobile Implementation Steps

### Phase 1: Core Event Display ✅ (Database Done)

**Status**: Database schema complete, ready for mobile integration

### Phase 2: Animated Map Markers (NEXT)

**File**: `ExploreScreen.tsx`

1. **Add event types and state**:
```typescript
interface FutureEvent {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
  lat: number;
  lng: number;
  timeframe: 'soon' | 'upcoming' | 'future';
  attendee_count: number;
  attendees: Array<{user_id: string; username: string}>;
  creator_id: string;
}

const [futureEvents, setFutureEvents] = useState<FutureEvent[]>([]);
const [showFutureEvents, setShowFutureEvents] = useState(true);
```

2. **Load future events**:
```typescript
const loadFutureEvents = async () => {
  const { data, error } = await supabase
    .from('events_with_details')
    .select('*')
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true });

  if (!error) setFutureEvents(data);
};
```

3. **Create pulsing marker component**:
```typescript
const PulsingEventMarker = ({ event, onPress }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const getEventColor = (timeframe) => {
    switch(timeframe) {
      case 'soon': return '#FFB800'; // Gold
      case 'upcoming': return '#3B82F6'; // Blue
      case 'future': return '#A855F7'; // Purple
      default: return '#6B7280'; // Gray
    }
  };

  return (
    <Marker coordinate={{latitude: event.lat, longitude: event.lng}}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <View style={[styles.eventMarker, {
          shadowColor: getEventColor(event.timeframe),
          shadowRadius: 20,
          shadowOpacity: 0.8,
        }]}>
          <Icon name={getEventIcon(event.event_type)} size={24} color="#FFF" />
          {event.attendee_count > 1 && (
            <View style={styles.attendeeBadge}>
              <Text style={styles.attendeeCount}>{event.attendee_count}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </Marker>
  );
};
```

### Phase 3: Event Details Modal

**Component**: New modal in `ExploreScreen.tsx`

```typescript
const EventDetailsModal = ({ event, visible, onClose }) => (
  <Modal visible={visible} animationType="slide">
    <View style={styles.eventModal}>
      {/* Header with timeframe indicator */}
      <View style={[styles.eventHeader, {
        backgroundColor: getEventColor(event.timeframe)
      }]}>
        <Icon name={getEventIcon(event.event_type)} size={48} color="#FFF" />
        <Text style={styles.eventTimeframe}>
          {event.timeframe.toUpperCase()}
        </Text>
      </View>

      {/* Event details */}
      <ScrollView style={styles.eventContent}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventDate}>
          {formatEventDate(event.event_date)}
        </Text>

        {/* Attendees list */}
        <View style={styles.attendeesSection}>
          <Text style={styles.sectionTitle}>
            👥 {event.attendee_count} Going
          </Text>
          {event.attendees.map(attendee => (
            <View key={attendee.user_id} style={styles.attendeeRow}>
              <Text>{attendee.display_name || attendee.username}</Text>
            </View>
          ))}
        </View>

        {/* Description */}
        {event.description && (
          <Text style={styles.eventDescription}>{event.description}</Text>
        )}
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.eventActions}>
        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => joinEvent(event.id)}
        >
          <Icon name="person-add" size={20} color="#FFF" />
          <Text style={styles.joinButtonText}>Join Event</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.notifyButton}>
          <Icon name="notifications" size={20} />
          <Text>Remind Me</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);
```

### Phase 4: Timeline Filter

**UI Component**: Sliding timeline at top of map

```typescript
const TimelineFilter = ({ onFilterChange }) => {
  const [selectedRange, setSelectedRange] = useState('all');

  return (
    <View style={styles.timelineFilter}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <FilterChip label="All" value="all" />
        <FilterChip label="This Week" value="week" />
        <FilterChip label="This Month" value="month" />
        <FilterChip label="Next 3 Months" value="quarter" />
      </ScrollView>
    </View>
  );
};
```

### Phase 5: Create Event Flow

**New Screen**: `CreateEventScreen.tsx`

Features:
- Select location from map or search
- Choose date & time (date picker)
- Select event type dropdown
- Add title & description
- Set visibility (public/friends/private)
- Set max attendees (optional)
- Link to existing place (optional)

## User Flows

### 1. View Friend's Event
```
Map → See pulsing gold marker → Tap marker → See event details →
"Sarah + 2 friends" at "Nobu" "Friday 8pm" → [Join Event]
```

### 2. Create Event
```
Map → Long press location → "Create Event" button →
Fill event details → Select "Friends can see" → Create →
Friends get notification
```

### 3. Join Event
```
Notification: "Sarah is going to Nobu Friday" → Tap →
Navigate to map showing event → Tap "Join" →
Status changes to "confirmed" → Sarah gets notification
```

### 4. Browse Future Events
```
Map → Timeline filter "This Week" → See only upcoming week →
Cluster of 5 events downtown → Tap cluster → List view →
Choose event to view details
```

## Notification Integration

### New Notification Types

1. **future_event** - Friend created an event
   ```
   "Sarah is going to The Troubadour on Oct 15 at 8:00 PM"
   → Tap to view event and join
   ```

2. **event_join** - Someone joined your event
   ```
   "Mike joined your event: Dinner at Nobu"
   → Tap to see updated attendee list
   ```

3. **event_reminder** - Event happening soon (day before)
   ```
   "Reminder: Dinner at Nobu tomorrow at 8:00 PM"
   → Tap to view event details
   ```

## Privacy & Settings

### Event Visibility Options
- **Public**: Anyone can see (future feature)
- **Friends**: Only your friends can see
- **Private**: Only you and invited attendees

### User Preferences
- "Auto-show future events on map" (toggle)
- "Notify me when friends create events" (toggle)
- "Default event visibility" (dropdown)
- "Remind me before events" (toggle + time selection)

## Technical Considerations

### Performance
- Load only events within map viewport bounds
- Implement event clustering for dense areas
- Lazy load attendee details
- Cache event data with 5-minute TTL

### Real-time Updates
```typescript
// Subscribe to event changes
const subscription = supabase
  .channel('future-events-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'future_events',
  }, loadFutureEvents)
  .subscribe();
```

### Animation Performance
- Use `useNativeDriver: true` for transform animations
- Limit simultaneous pulsing markers (pause if off-screen)
- Use `InteractionManager` to defer non-critical animations

## Testing Checklist

- [ ] Create event with all fields
- [ ] Event appears on map with correct color/animation
- [ ] Friends receive notification
- [ ] Join event as friend
- [ ] Creator receives join notification
- [ ] Attendee list updates in real-time
- [ ] Timeline filter works correctly
- [ ] Events past their date are handled (auto-archive?)
- [ ] Privacy settings respected (private events don't leak)
- [ ] Clustering works with multiple events

## Future Enhancements

1. **Event Reminders** - Push notifications day-of
2. **RSVP System** - Maybe/Yes/No responses
3. **Event Chat** - Group chat for attendees
4. **Recurring Events** - Weekly meetups, monthly dinners
5. **Event Photos** - Share photos after event
6. **Trending Events** - "5 of your friends are going here this week"
7. **Calendar Integration** - Sync with iOS/Google Calendar
8. **Weather Integration** - Show forecast for event date
9. **Route Planning** - Directions to event location
10. **Event History** - See past events you attended

## Files to Create/Modify

### New Files
1. `/SyrenaMobile/src/screens/CreateEventScreen.tsx` - Create event UI
2. `/SyrenaMobile/src/components/PulsingEventMarker.tsx` - Animated marker
3. `/SyrenaMobile/src/components/EventDetailsModal.tsx` - Event details
4. `/SyrenaMobile/src/components/TimelineFilter.tsx` - Timeline filter UI

### Modified Files
1. `/SyrenaMobile/src/screens/ExploreScreen.tsx` - Add event markers
2. `/SyrenaMobile/src/screens/NotificationsScreen.tsx` - Handle new types
3. `/SyrenaMobile/App.tsx` - Add CreateEvent to navigation

## Next Steps

1. ✅ Run `create-future-events-system.sql` in Supabase
2. ⏳ Implement pulsing event markers in ExploreScreen
3. ⏳ Create EventDetailsModal component
4. ⏳ Add CreateEventScreen
5. ⏳ Test with multiple users creating/joining events
6. ⏳ Add timeline filter
7. ⏳ Polish animations and transitions

Would you like me to start implementing the animated markers and event details modal?
