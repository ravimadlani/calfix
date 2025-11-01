import {
  addConferenceLink,
  createEvent,
  deleteEvent,
  fetchCalendarList,
  fetchEvents,
  findFreeBusy,
  findNextAvailableSlot,
  googleHelperActions,
  handleGoogleApiError,
  updateEvent
} from './providers/google/calendar';

export { fetchEvents, createEvent, updateEvent, deleteEvent, fetchCalendarList, findFreeBusy, findNextAvailableSlot };

export const createBufferEvent = googleHelperActions.createBufferEvent!;
export const createFocusBlock = googleHelperActions.createFocusBlock!;
export const createTravelBlock = googleHelperActions.createTravelBlock!;
export const createLocationEvent = googleHelperActions.createLocationEvent!;
export const moveEvent = googleHelperActions.moveEvent!;
export const addBufferBefore = googleHelperActions.addBufferBefore!;
export const addBufferAfter = googleHelperActions.addBufferAfter!;
export const batchAddBuffers = googleHelperActions.batchAddBuffers!;
export const deletePlaceholderAndLog = googleHelperActions.deletePlaceholderAndLog!;
export const getOptimalTimeTomorrow = googleHelperActions.getOptimalTimeTomorrow!;
export const addGoogleMeetLink = addConferenceLink;
export const batchAddGoogleMeetLinks = googleHelperActions.batchAddConferenceLinks!;

export { handleGoogleApiError };
