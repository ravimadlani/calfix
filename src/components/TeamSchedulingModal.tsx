/**
 * Team Scheduling Modal
 * Find availability across team members and schedule meetings with customers
 */

import React, { useState } from 'react';
import { findFreeBusy } from '../services/googleCalendar';

const TeamSchedulingModal = ({ onClose, onSchedule, managedCalendarId = 'primary' }) => {
  const [step, setStep] = useState(1); // 1: Input, 2: Availability, 3: Draft Email
  const [teamEmails, setTeamEmails] = useState(['']);
  const [customerEmail, setCustomerEmail] = useState('');
  const [meetingDuration, setMeetingDuration] = useState(60); // minutes
  const [searchDays, setSearchDays] = useState(7); // how many days to search
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [emailDraft, setEmailDraft] = useState('');
  const [selectedTimezones, setSelectedTimezones] = useState([
    Intl.DateTimeFormat().resolvedOptions().timeZone // Default to user's timezone
  ]);
  const [viewTimezone, setViewTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone // Timezone for viewing slots
  );
  const [utcStartHour, setUtcStartHour] = useState(14); // 14:00 UTC = 9 AM ET / 6 AM PT
  const [utcEndHour, setUtcEndHour] = useState(22); // 22:00 UTC = 5 PM ET / 2 PM PT
  const [includeTeamInHolds, setIncludeTeamInHolds] = useState(false); // Whether to add team as attendees to holds

  // Common timezones
  const commonTimezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEDT)' }
  ];

  // Add email input field
  const addEmailField = () => {
    setTeamEmails([...teamEmails, '']);
  };

  // Update email at index
  const updateEmail = (index, value) => {
    const updated = [...teamEmails];
    updated[index] = value;
    setTeamEmails(updated);
  };

  // Remove email field
  const removeEmail = (index) => {
    setTeamEmails(teamEmails.filter((_, i) => i !== index));
  };

  // Toggle timezone selection
  const toggleTimezone = (timezone) => {
    if (selectedTimezones.includes(timezone)) {
      // Don't allow removing the last timezone
      if (selectedTimezones.length > 1) {
        setSelectedTimezones(selectedTimezones.filter(tz => tz !== timezone));
      }
    } else {
      setSelectedTimezones([...selectedTimezones, timezone]);
    }
  };

  // Format time in multiple timezones
  const formatTimeInTimezones = (date) => {
    return selectedTimezones.map(tz => {
      const timeStr = date.toLocaleTimeString('en-US', {
        timeZone: tz,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      const tzLabel = commonTimezones.find(t => t.value === tz)?.label || tz;
      return `${timeStr} ${tzLabel}`;
    }).join(' / ');
  };

  // Search for availability
  const searchAvailability = async () => {
    setLoading(true);
    try {
      // Filter out empty emails
      const validEmails = teamEmails.filter(email => email.trim() !== '');

      if (validEmails.length === 0) {
        alert('Please add at least one team member email');
        setLoading(false);
        return;
      }

      // Search next N days
      const now = new Date();
      const startDate = new Date(now);
      startDate.setHours(9, 0, 0, 0); // Start at 9 AM today

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + searchDays);
      endDate.setHours(17, 0, 0, 0); // End at 5 PM

      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      console.log(`=== SEARCH PARAMETERS ===`);
      console.log(`Search days requested: ${searchDays}`);
      console.log(`Actual days to search: ${daysDiff}`);
      console.log(`Start: ${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()}`);
      console.log(`End: ${endDate.toLocaleDateString()} ${endDate.toLocaleTimeString()}`);
      console.log(`Searching availability from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      console.log(`Team members: ${managedCalendarId}, ${validEmails.join(', ')}`);

      // Use Google Calendar Free/Busy API
      const freeBusyData = await findFreeBusy(
        startDate.toISOString(),
        endDate.toISOString(),
        [managedCalendarId, ...validEmails]
      );

      console.log('Free/Busy data received:', freeBusyData);

      // Find common free slots
      const slots = findCommonFreeSlots(
        freeBusyData,
        [managedCalendarId, ...validEmails],
        startDate,
        endDate,
        meetingDuration,
        utcStartHour,
        utcEndHour
      );

      console.log(`Found ${slots.length} common free slots`);
      setAvailability(slots);
      setStep(2);
    } catch (error) {
      console.error('Error searching availability:', error);
      alert('Error finding availability: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Find common free slots across all team members
  const findCommonFreeSlots = (freeBusyData, emails, startDate, endDate, duration, startHourUTC, endHourUTC) => {
    const slots = [];
    const durationMs = duration * 60 * 1000;

    console.log('=== Finding Common Free Slots ===');
    console.log('Duration:', duration, 'minutes');
    console.log('UTC Hours:', `${startHourUTC}:00 - ${endHourUTC}:00`);
    console.log('Date range:', startDate.toLocaleString(), 'to', endDate.toLocaleString());
    console.log('Checking calendars for:', emails);

    // Debug: show busy periods for each calendar
    emails.forEach(email => {
      const calendar = freeBusyData.calendars?.[email];
      if (calendar?.busy) {
        console.log(`${email} has ${calendar.busy.length} busy periods:`);
        calendar.busy.forEach(busy => {
          console.log(`  - ${new Date(busy.start).toLocaleString()} to ${new Date(busy.end).toLocaleString()}`);
        });
      } else {
        console.log(`${email}: No busy periods (completely free or no data)`);
      }
    });

    // Iterate through each day
    let currentDate = new Date(startDate);
    let totalSlotsChecked = 0;
    let slotsInPast = 0;
    let slotsAfterHours = 0;
    let slotsWithConflicts = 0;
    let datesChecked = [];

    while (currentDate < endDate) {
      // Skip weekends
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      datesChecked.push(currentDate.toLocaleDateString());

      // Check each 30-minute slot during specified UTC hours
      for (let hour = startHourUTC; hour < endHourUTC; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const slotStart = new Date(currentDate);
          slotStart.setUTCHours(hour, minute, 0, 0);

          const slotEnd = new Date(slotStart.getTime() + durationMs);
          totalSlotsChecked++;

          // Check if slot is in the past
          if (slotStart < new Date()) {
            slotsInPast++;
            continue;
          }

          // Check if slot end goes beyond specified UTC hours
          if (slotEnd.getUTCHours() >= endHourUTC ||
              (slotEnd.getUTCHours() === endHourUTC && slotEnd.getUTCMinutes() > 0)) {
            slotsAfterHours++;
            continue;
          }

          // Check if all team members are free during this slot
          let conflicts = [];
          const allFree = emails.every(email => {
            const calendar = freeBusyData.calendars?.[email];
            if (!calendar || !calendar.busy) return true;

            // Check if slot overlaps with any busy periods
            const hasConflict = calendar.busy.some(busyPeriod => {
              const busyStart = new Date(busyPeriod.start);
              const busyEnd = new Date(busyPeriod.end);

              // Check for overlap
              const overlaps = slotStart < busyEnd && slotEnd > busyStart;
              if (overlaps) {
                conflicts.push({ email, busyStart, busyEnd });
              }
              return overlaps;
            });

            return !hasConflict;
          });

          if (allFree) {
            // Mark if slot is outside standard business hours (14-22 UTC = 9 AM - 5 PM ET)
            const isOutsideStandardHours = hour < 14 || hour >= 22;
            console.log(`✓ FREE SLOT FOUND: ${slotStart.toISOString()} - ${slotEnd.toISOString()}`);
            slots.push({
              start: slotStart,
              end: slotEnd,
              duration: duration,
              outsideBusinessHours: isOutsideStandardHours
            });
          } else {
            slotsWithConflicts++;
            // Log first few conflicts for debugging
            if (slotsWithConflicts <= 5) {
              console.log(`✗ Conflict at ${slotStart.toISOString()}:`, conflicts);
            }
          }
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('=== Slot Search Summary ===');
    console.log('Total slots checked:', totalSlotsChecked);
    console.log('Slots in past:', slotsInPast);
    console.log('Slots after hours:', slotsAfterHours);
    console.log('Slots with conflicts:', slotsWithConflicts);
    console.log('Free slots found:', slots.length);

    return slots;
  };

  // Toggle slot selection
  const toggleSlot = (slot) => {
    const slotKey = slot.start.toISOString();
    const exists = selectedSlots.find(s => s.start.toISOString() === slotKey);

    if (exists) {
      setSelectedSlots(selectedSlots.filter(s => s.start.toISOString() !== slotKey));
    } else {
      setSelectedSlots([...selectedSlots, slot]);
    }
  };

  // Generate email draft
  const generateEmailDraft = () => {
    if (selectedSlots.length === 0) {
      alert('Please select at least one time slot');
      return;
    }

    // Sort slots by date
    const sorted = [...selectedSlots].sort((a, b) => a.start - b.start);

    // Format slots for email with multiple timezones
    const slotText = sorted.map((slot, index) => {
      const date = slot.start.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });

      const timeRanges = selectedTimezones.map(tz => {
        const startTime = slot.start.toLocaleTimeString('en-US', {
          timeZone: tz,
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        const endTime = slot.end.toLocaleTimeString('en-US', {
          timeZone: tz,
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        const tzLabel = commonTimezones.find(t => t.value === tz)?.label || tz;
        return `${startTime} - ${endTime} ${tzLabel}`;
      }).join(' / ');

      return `${index + 1}. ${date}\n   ${timeRanges}`;
    }).join('\n\n');

    const draft = `Hi,

Thank you for your interest in meeting with our team. We have availability at the following times:

${slotText}

Please let me know which time works best for you, and I'll send a calendar invitation.

Best regards`;

    setEmailDraft(draft);
    setStep(3);
  };

  // Create calendar holds for team
  const createCalendarHolds = async () => {
    try {
      setLoading(true);

      // This would create "hold" events on team calendars
      // For now, we'll just prepare the data
      const holds = selectedSlots.map(slot => ({
        summary: `🔒 Hold for ${customerEmail || 'Customer'} Meeting`,
        description: 'Calendar hold - pending customer confirmation',
        start: {
          dateTime: slot.start.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: slot.end.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        attendees: includeTeamInHolds ? teamEmails.filter(e => e.trim()).map(email => ({ email })) : [],
        colorId: '11', // Red color for holds
        transparency: 'opaque'
      }));

      // Call the onSchedule callback with the holds data
      if (onSchedule) {
        await onSchedule(holds, emailDraft);
      }

      alert('Calendar holds created! Email draft is ready to send.');
      onClose();
    } catch (error) {
      console.error('Error creating calendar holds:', error);
      alert('Error creating calendar holds: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Format date/time for display in selected timezone
  const formatSlotTime = (slot) => {
    const date = slot.start.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: viewTimezone
    });
    const startTime = slot.start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: viewTimezone
    });
    const endTime = slot.end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: viewTimezone
    });

    return `${date} • ${startTime} - ${endTime}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">📅</span>
              <div>
                <h2 className="text-2xl font-bold">Meeting Scheduler</h2>
                <p className="text-sm opacity-90 mt-1">
                  Step {step} of 3: {
                    step === 1 ? 'Team & Settings' :
                    step === 2 ? 'Select Time Slots' :
                    'Email Draft & Send'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-3xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6">
              {/* Customer Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Email (optional)
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                />
              </div>

              {/* Team Members */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Members (enter their Gmail addresses)
                </label>
                <div className="space-y-2">
                  {teamEmails.map((email, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => updateEmail(index, e.target.value)}
                        placeholder="teammate@example.com"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                      />
                      {teamEmails.length > 1 && (
                        <button
                          onClick={() => removeEmail(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addEmailField}
                  className="mt-2 text-sm text-slate-700 hover:text-slate-900 font-medium"
                >
                  + Add another team member
                </button>
              </div>

              {/* Meeting Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting Duration
                  </label>
                  <select
                    value={meetingDuration}
                    onChange={(e) => setMeetingDuration(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Next
                  </label>
                  <select
                    value={searchDays}
                    onChange={(e) => setSearchDays(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  >
                    <option value={3}>3 days</option>
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                  </select>
                </div>
              </div>

              {/* UTC Working Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  UTC Working Hours (time window to search for slots)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Start Hour (UTC)</label>
                    <select
                      value={utcStartHour}
                      onChange={(e) => setUtcStartHour(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i.toString().padStart(2, '0')}:00 UTC
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">End Hour (UTC)</label>
                    <select
                      value={utcEndHour}
                      onChange={(e) => setUtcEndHour(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {(i + 1).toString().padStart(2, '0')}:00 UTC
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Current: {utcStartHour}:00-{utcEndHour}:00 UTC
                  {' = '}
                  {new Date().toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZone: 'America/New_York',
                    hour12: true
                  }).replace(/\d+:\d+/, `${((utcStartHour - 5 + 24) % 24)}:00`)} -
                  {new Date().toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZone: 'America/New_York',
                    hour12: true
                  }).replace(/\d+:\d+/, `${((utcEndHour - 5 + 24) % 24)}:00`)} ET
                </p>
              </div>

              {/* Timezone Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezones to Include in Email ({selectedTimezones.length} selected)
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Select timezones to show in the email. Times will be displayed in all selected zones.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {commonTimezones.map((tz) => (
                    <button
                      key={tz.value}
                      onClick={() => toggleTimezone(tz.value)}
                      className={`px-3 py-2 rounded-lg border-2 text-left text-sm transition-all ${
                        selectedTimezones.includes(tz.value)
                          ? 'border-green-500 bg-green-50 text-green-900 font-medium'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{tz.label}</span>
                        {selectedTimezones.includes(tz.value) && (
                          <span className="text-green-600">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700">
                    <strong>{availability.length}</strong> time slots found where all team members are available.
                    Select the options you want to offer to the customer.
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600 font-medium">View in:</label>
                    <select
                      value={viewTimezone}
                      onChange={(e) => setViewTimezone(e.target.value)}
                      className="text-sm px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    >
                      {commonTimezones.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {availability.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg font-medium">No availability found</p>
                  <p className="text-sm mt-2">Try extending the search period or checking fewer team members.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availability.slice(0, 20).map((slot, index) => {
                    const isSelected = selectedSlots.some(s =>
                      s.start.toISOString() === slot.start.toISOString()
                    );

                    return (
                      <button
                        key={index}
                        onClick={() => toggleSlot(slot)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          isSelected
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {formatSlotTime(slot)}
                              {slot.outsideBusinessHours && (
                                <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                  Outside 9-5
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {slot.duration} minutes
                            </div>
                          </div>
                          {isSelected && (
                            <span className="text-green-600 text-2xl">✓</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Draft for Customer
                </label>
                <textarea
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 font-mono text-sm"
                />
              </div>

              {/* Calendar Hold Options */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTeamInHolds}
                    onChange={(e) => setIncludeTeamInHolds(e.target.checked)}
                    className="w-4 h-4 text-slate-600 border-gray-300 rounded focus:ring-slate-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Add team members as attendees to calendar holds
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      If unchecked, holds will only be created on your calendar. If checked, team members will receive calendar invitations.
                    </p>
                  </div>
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Next steps:</strong> Copy this email and send it to your customer.
                  Calendar holds will be created {includeTeamInHolds ? 'for you and your team members' : 'on your calendar only'}.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              onClick={step > 1 ? () => setStep(step - 1) : onClose}
              className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium"
            >
              {step > 1 ? 'Back' : 'Cancel'}
            </button>

            <div className="flex gap-3">
              {step === 1 && (
                <button
                  onClick={searchAvailability}
                  disabled={loading}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Searching...' : 'Find Availability'}
                </button>
              )}

              {step === 2 && (
                <button
                  onClick={generateEmailDraft}
                  disabled={selectedSlots.length === 0}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue ({selectedSlots.length} selected)
                </button>
              )}

              {step === 3 && (
                <button
                  onClick={createCalendarHolds}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Holds...' : 'Create Calendar Holds & Copy Email'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamSchedulingModal;
