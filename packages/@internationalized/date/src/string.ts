/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {AnyDateTime, Disambiguation} from './types';
import {CalendarDate, CalendarDateTime, Time, ZonedDateTime} from './CalendarDate';
import {epochFromDate, fromAbsolute, possibleAbsolutes, toAbsolute, toCalendar, toCalendarDateTime, toTimeZone} from './conversion';
import {getLocalTimeZone} from './queries';
import {GregorianCalendar} from './calendars/GregorianCalendar';
import {Mutable} from './utils';

const TIME_RE = /^(\d{2})(?::(\d{2}))?(?::(\d{2}))?(\.\d+)?$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_RE = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}))?(?::(\d{2}))?(?::(\d{2}))?(\.\d+)?$/;
const ZONED_DATE_TIME_RE = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}))?(?::(\d{2}))?(?::(\d{2}))?(\.\d+)?(?:([+-]\d{2})(?::(\d{2}))?)?\[(.*?)\]$/;
const ABSOLUTE_RE = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}))?(?::(\d{2}))?(?::(\d{2}))?(\.\d+)?(?:(?:([+-]\d{2})(?::(\d{2}))?)|Z)$/;

export function parseTime(value: string): Time {
  let m = value.match(TIME_RE);
  if (!m) {
    throw new Error('Invalid ISO 8601 time string: ' + value);
  }

  return new Time(
    parseNumber(m[1], 0, 23),
    m[2] ? parseNumber(m[2], 0, 59) : 0,
    m[3] ? parseNumber(m[3], 0, 59) : 0,
    m[4] ? parseNumber(m[4], 0, Infinity) * 1000 : 0
  );
}

export function parseDate(value: string): CalendarDate {
  let m = value.match(DATE_RE);
  if (!m) {
    throw new Error('Invalid ISO 8601 date string: ' + value);
  }

  let date: Mutable<CalendarDate> = new CalendarDate(
    parseNumber(m[1], 0, 9999),
    parseNumber(m[2], 1, 12),
    1
  );

  date.day = parseNumber(m[3], 0, date.calendar.getDaysInMonth(date));
  return date as CalendarDate;
}

export function parseDateTime(value: string): CalendarDateTime {
  let m = value.match(DATE_TIME_RE);
  if (!m) {
    throw new Error('Invalid ISO 8601 date time string: ' + value);
  }

  let date: Mutable<CalendarDateTime> = new CalendarDateTime(
    parseNumber(m[1], 1, 9999),
    parseNumber(m[2], 1, 12),
    1,
    m[4] ? parseNumber(m[4], 0, 23) : 0,
    m[5] ? parseNumber(m[5], 0, 59) : 0,
    m[6] ? parseNumber(m[6], 0, 59) : 0,
    m[7] ? parseNumber(m[7], 0, Infinity) * 1000 : 0
  );

  date.day = parseNumber(m[3], 0, date.calendar.getDaysInMonth(date));
  return date as CalendarDateTime;
}

export function parseZonedDateTime(value: string, disambiguation?: Disambiguation): ZonedDateTime {
  let m = value.match(ZONED_DATE_TIME_RE);
  if (!m) {
    throw new Error('Invalid ISO 8601 date time string: ' + value);
  }

  let date: Mutable<ZonedDateTime> = new ZonedDateTime(
    parseNumber(m[1], 1, 9999),
    parseNumber(m[2], 1, 12),
    1,
    m[10],
    0,
    m[4] ? parseNumber(m[4], 0, 23) : 0,
    m[5] ? parseNumber(m[5], 0, 59) : 0,
    m[6] ? parseNumber(m[6], 0, 59) : 0,
    m[7] ? parseNumber(m[7], 0, Infinity) * 1000 : 0
  );

  date.day = parseNumber(m[3], 0, date.calendar.getDaysInMonth(date));

  let plainDateTime = toCalendarDateTime(date as ZonedDateTime);

  let ms: number;
  if (m[8]) {
    date.offset = parseNumber(m[8], -23, 23) * 60 * 60 * 1000 + parseNumber(m[9] ?? '0', 0, 59) * 60 * 1000;
    ms = epochFromDate(date as ZonedDateTime) - date.offset;

    // Validate offset against parsed date.
    let absolutes = possibleAbsolutes(plainDateTime, date.timeZone);
    if (!absolutes.includes(ms)) {
      throw new Error(`Offset ${offsetToString(date.offset)} is invalid for ${dateTimeToString(date)} in ${date.timeZone}`);
    }
  } else {
    // Convert to absolute and back to fix invalid times due to DST.
    ms = toAbsolute(toCalendarDateTime(plainDateTime), date.timeZone, disambiguation);
  }

  return fromAbsolute(ms, date.timeZone);
}

export function parseAbsolute(value: string, timeZone: string): ZonedDateTime {
  let m = value.match(ABSOLUTE_RE);
  if (!m) {
    throw new Error('Invalid ISO 8601 date time string: ' + value);
  }

  let date: Mutable<ZonedDateTime> = new ZonedDateTime(
    parseNumber(m[1], 1, 9999),
    parseNumber(m[2], 1, 12),
    1,
    timeZone,
    0,
    m[4] ? parseNumber(m[4], 0, 23) : 0,
    m[5] ? parseNumber(m[5], 0, 59) : 0,
    m[6] ? parseNumber(m[6], 0, 59) : 0,
    m[7] ? parseNumber(m[7], 0, Infinity) * 1000 : 0
  );

  date.day = parseNumber(m[3], 0, date.calendar.getDaysInMonth(date));

  if (m[8]) {
    date.offset = parseNumber(m[8], -23, 23) * 60 * 60 * 1000 + parseNumber(m[9] ?? '0', 0, 59) * 60 * 1000;
  }

  return toTimeZone(date as ZonedDateTime, timeZone);
}

export function parseAbsoluteToLocal(value: string): ZonedDateTime {
  return parseAbsolute(value, getLocalTimeZone());
}

function parseNumber(value: string, min: number, max: number) {
  let val = Number(value);
  if (val < min || val > max) {
    throw new RangeError(`Value out of range: ${min} <= ${val} <= ${max}`);
  }

  return val;
}

export function timeToString(time: Time): string {
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}:${String(time.second).padStart(2, '0')}${time.millisecond ? String(time.millisecond / 1000).slice(1) : ''}`;
}

export function dateToString(date: CalendarDate): string {
  let gregorianDate = toCalendar(date, new GregorianCalendar());
  return `${String(gregorianDate.year).padStart(4, '0')}-${String(gregorianDate.month).padStart(2, '0')}-${String(gregorianDate.day).padStart(2, '0')}`;
}

export function dateTimeToString(date: AnyDateTime): string {
  // @ts-ignore
  return `${dateToString(date)}T${timeToString(date)}`;
}

function offsetToString(offset: number) {
  let sign = Math.sign(offset) < 0 ? '-' : '+';
  offset = Math.abs(offset);
  let offsetHours = Math.floor(offset / (60 * 60 * 1000));
  let offsetMinutes = (offset % (60 * 60 * 1000)) / (60 * 1000);
  return `${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
}

export function zonedDateTimeToString(date: ZonedDateTime): string {
  return `${dateTimeToString(date)}${offsetToString(date.offset)}[${date.timeZone}]`;
}
