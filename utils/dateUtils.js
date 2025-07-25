// ==================== utils/dateUtils.js ====================
const moment = require('moment');

const dateUtils = {
  // Format date for display
  formatDate(date, format = 'YYYY-MM-DD') {
    return moment(date).format(format);
  },

  // Format date and time
  formatDateTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
    return moment(date).format(format);
  },

  // Get relative time (e.g., "2 hours ago")
  getRelativeTime(date) {
    return moment(date).fromNow();
  },

  // Get time duration between two dates
  getDuration(startDate, endDate) {
    const start = moment(startDate);
    const end = moment(endDate);
    const duration = moment.duration(end.diff(start));
    
    return {
      milliseconds: duration.asMilliseconds(),
      seconds: Math.floor(duration.asSeconds()),
      minutes: Math.floor(duration.asMinutes()),
      hours: Math.floor(duration.asHours()),
      days: Math.floor(duration.asDays()),
      humanized: duration.humanize()
    };
  },

  // Get start of day
  getStartOfDay(date = new Date()) {
    return moment(date).startOf('day').toDate();
  },

  // Get end of day
  getEndOfDay(date = new Date()) {
    return moment(date).endOf('day').toDate();
  },

  // Get start of week
  getStartOfWeek(date = new Date()) {
    return moment(date).startOf('week').toDate();
  },

  // Get end of week
  getEndOfWeek(date = new Date()) {
    return moment(date).endOf('week').toDate();
  },

  // Get start of month
  getStartOfMonth(date = new Date()) {
    return moment(date).startOf('month').toDate();
  },

  // Get end of month
  getEndOfMonth(date = new Date()) {
    return moment(date).endOf('month').toDate();
  },

  // Add time to date
  addTime(date, amount, unit = 'days') {
    return moment(date).add(amount, unit).toDate();
  },

  // Subtract time from date
  subtractTime(date, amount, unit = 'days') {
    return moment(date).subtract(amount, unit).toDate();
  },

  // Check if date is today
  isToday(date) {
    return moment(date).isSame(moment(), 'day');
  },

  // Check if date is yesterday
  isYesterday(date) {
    return moment(date).isSame(moment().subtract(1, 'day'), 'day');
  },

  // Check if date is this week
  isThisWeek(date) {
    return moment(date).isSame(moment(), 'week');
  },

  // Check if date is this month
  isThisMonth(date) {
    return moment(date).isSame(moment(), 'month');
  },

  // Get age from birthdate
  getAge(birthDate) {
    return moment().diff(moment(birthDate), 'years');
  },

  // Get timezone offset
  getTimezoneOffset() {
    return moment().utcOffset();
  },

  // Convert to UTC
  toUTC(date) {
    return moment(date).utc().toDate();
  },

  // Convert from UTC to local timezone
  fromUTC(date, timezone = null) {
    if (timezone) {
      return moment.utc(date).tz(timezone).toDate();
    }
    return moment.utc(date).local().toDate();
  },

  // Get business days between dates
  getBusinessDays(startDate, endDate) {
    const start = moment(startDate);
    const end = moment(endDate);
    let current = start.clone();
    let businessDays = 0;

    while (current.isSameOrBefore(end)) {
      if (current.day() !== 0 && current.day() !== 6) { // Not Sunday or Saturday
        businessDays++;
      }
      current.add(1, 'day');
    }

    return businessDays;
  },

  // Format duration in human readable format
  formatDuration(seconds) {
    const duration = moment.duration(seconds, 'seconds');
    
    if (duration.asHours() >= 1) {
      return `${Math.floor(duration.asHours())}h ${duration.minutes()}m`;
    } else if (duration.asMinutes() >= 1) {
      return `${Math.floor(duration.asMinutes())}m ${duration.seconds()}s`;
    } else {
      return `${duration.seconds()}s`;
    }
  },

  // Get time slots for a given day
  getTimeSlots(date, intervalMinutes = 30, startHour = 9, endHour = 17) {
    const slots = [];
    const start = moment(date).hour(startHour).minute(0).second(0);
    const end = moment(date).hour(endHour).minute(0).second(0);
    
    let current = start.clone();
    while (current.isBefore(end)) {
      slots.push({
        start: current.toDate(),
        end: current.clone().add(intervalMinutes, 'minutes').toDate(),
        formatted: current.format('HH:mm')
      });
      current.add(intervalMinutes, 'minutes');
    }
    
    return slots;
  },

  // Get week number
  getWeekNumber(date = new Date()) {
    return moment(date).week();
  },

  // Get days in month
  getDaysInMonth(date = new Date()) {
    return moment(date).daysInMonth();
  },

  // Get calendar month data
  getCalendarMonth(date = new Date()) {
    const start = moment(date).startOf('month').startOf('week');
    const end = moment(date).endOf('month').endOf('week');
    const calendar = [];
    
    let current = start.clone();
    while (current.isSameOrBefore(end)) {
      calendar.push({
        date: current.toDate(),
        day: current.date(),
        isCurrentMonth: current.month() === moment(date).month(),
        isToday: current.isSame(moment(), 'day'),
        formatted: current.format('YYYY-MM-DD')
      });
      current.add(1, 'day');
    }
    
    return calendar;
  },

  // Calculate learning streak
  calculateStreak(dates) {
    if (!dates.length) return 0;
    
    const sortedDates = dates
      .map(d => moment(d).format('YYYY-MM-DD'))
      .sort()
      .filter((date, index, arr) => arr.indexOf(date) === index); // Remove duplicates
    
    let streak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = moment(sortedDates[i - 1]);
      const currentDate = moment(sortedDates[i]);
      
      if (currentDate.diff(prevDate, 'days') === 1) {
        currentStreak++;
        streak = Math.max(streak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    
    return streak;
  },

  // Check if time is within business hours
  isBusinessHours(date = new Date(), startHour = 9, endHour = 17) {
    const hour = moment(date).hour();
    const day = moment(date).day();
    
    // Monday = 1, Friday = 5
    return day >= 1 && day <= 5 && hour >= startHour && hour < endHour;
  },

  // Get next business day
  getNextBusinessDay(date = new Date()) {
    let next = moment(date).add(1, 'day');
    
    while (next.day() === 0 || next.day() === 6) { // Skip weekends
      next = next.add(1, 'day');
    }
    
    return next.toDate();
  },

  // Format time ago with custom intervals
  timeAgo(date) {
    const now = moment();
    const then = moment(date);
    const diff = now.diff(then);
    
    if (diff < 60000) return 'just now'; // Less than 1 minute
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`; // Less than 1 hour
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`; // Less than 1 day
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`; // Less than 1 week
    
    return then.format('MMM DD, YYYY');
  },

  // Get academic year based on date
  getAcademicYear(date = new Date()) {
    const year = moment(date).year();
    const month = moment(date).month(); // 0-based
    
    // Academic year typically starts in August/September
    if (month >= 7) { // August = 7
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }
};

module.exports = dateUtils;