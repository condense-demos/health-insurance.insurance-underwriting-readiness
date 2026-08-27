export function addTimeline(
  state,
  eventType,
  message,
  timestamp = new Date().toISOString()
) {
  state.timeline ||= [];

  const event = {
    eventType,
    message,
    timestamp
  };

  state.timeline.push(event);

  if (state.timeline.length > 100) {
    state.timeline = state.timeline.slice(-100);
  }

  return event;
}
