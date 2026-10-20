import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Today, Calendar, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useCalendarEvents } from '../hooks/useQueries';
import { formatDate } from '../utils/helpers';
import type { CalendarEvent } from '../types';

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'month' | 'week'>('month');

  const start = startOfWeek(startOfMonth(currentMonth));
  const end = endOfWeek(endOfMonth(currentMonth));
  
  const { data: events, isLoading, refetch } = useCalendarEvents(
    format(start, 'yyyy-MM-dd'),
    format(end, 'yyyy-MM-dd')
  );

  useEffect(() => {
    refetch();
  }, [currentMonth, refetch]);

  const daysInView = useMemo(() => {
    const days: Date[] = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [start, end]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events?.forEach((event) => {
      const dateKey = format(event.start, 'yyyy-MM-dd');
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(event);
    });
    return map;
  }, [events]);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const getDayEvents = (date: Date) => {
    return eventsByDate[format(date, 'yyyy-MM-dd')] || [];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">View rental schedule</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={goToToday}>
            <Today className="h-4 w-4 mr-2" />
            Today
          </Button>
          <Link to="/rentals/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Rental
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold min-w-[200px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={view === 'month' ? 'primary' : 'outline'}
              onClick={() => setView('month')}
            >
              Month
            </Button>
            <Button
              variant={view === 'week' ? 'primary' : 'outline'}
              onClick={() => setView('week')}
            >
              Week
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {view === 'month' ? (
            <div className="grid grid-cols-7 gap-0.5">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
              {daysInView.map((day) => {
                const dayEvents = getDayEvents(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      'relative h-24 min-h-[120px] p-2 border rounded-lg text-left transition-colors',
                      !isCurrentMonth && 'text-muted-foreground/50 bg-muted/30',
                      isSelected && 'ring-2 ring-primary bg-primary/5',
                      isTodayDate && !isSelected && 'bg-primary/5 border-primary',
                      'hover:bg-accent'
                    )}
                    disabled={isLoading}
                  >
                    <div className={cn('text-sm font-medium', isTodayDate && 'text-primary')}>
                      {format(day, 'd')}
                    </div>
                    <div className="mt-1 space-y-1 max-h-[80px] overflow-y-auto">
                      {dayEvents.slice(0, 3).map((event) => (
                        <Link
                          key={event.id}
                          to={`/rentals/${event.rentalId}`}
                          className="block truncate text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: event.color + '20', color: event.color }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {event.computerName}
                        </Link>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground truncate px-1">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="w-24 py-2 text-left font-medium text-muted-foreground">Time</th>
                    {Array.from({ length: 7 }, (_, i) => {
                      const day = addDays(startOfWeek(currentMonth), i);
                      return (
                        <th key={i} className="py-2 text-center font-medium">
                          <div className={cn('text-sm', isToday(day) && 'text-primary font-bold')}>
                            {format(day, 'EEE')}
                          </div>
                          <div className={cn('text-lg font-semibold', isToday(day) && 'text-primary')}>
                            {format(day, 'd')}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 24 }, (_, hour) => (
                    <tr key={hour}>
                      <td className="w-24 py-1 text-right text-sm text-muted-foreground pr-2">
                        {format(new Date(2000, 0, 1, hour), 'ha')}
                      </td>
                      {Array.from({ length: 7 }, (_, i) => {
                        const day = addDays(startOfWeek(currentMonth), i);
                        const dayEvents = getDayEvents(day).filter(
                          (e) => e.start.getHours() <= hour && e.end.getHours() > hour
                        );
                        return (
                          <td key={i} className="border p-1 min-h-[60px] relative">
                            {dayEvents.map((event) => (
                              <Link
                                key={event.id}
                                to={`/rentals/${event.rentalId}`}
                                className="absolute inset-x-0.5 rounded bg-opacity-20 text-xs px-1 py-0.5 truncate"
                                style={{
                                  top: `${(event.start.getMinutes() / 60) * 100}%`,
                                  height: `${((event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60)) * 100}%`,
                                  backgroundColor: event.color + '20',
                                  borderColor: event.color,
                                  color: event.color,
                                }}
                              >
                                {event.computerName}
                              </Link>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedDate && (
            <div className="mt-6 p-4 border rounded-lg bg-card">
              <h3 className="font-medium mb-3">Events on {formatDate(selectedDate)}</h3>
              {getDayEvents(selectedDate).length === 0 ? (
                <p className="text-muted-foreground">No events on this day</p>
              ) : (
                <div className="space-y-2">
                  {getDayEvents(selectedDate).map((event) => (
                    <Link
                      key={event.id}
                      to={`/rentals/${event.rentalId}`}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: event.color }} />
                      <div className="flex-1">
                        <p className="font-medium">{event.computerName}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')} • {event.userName}
                        </p>
                      </div>
                      <Badge variant={event.status === 'active' ? 'success' : event.status === 'pending' ? 'warning' : 'default'}>
                        {event.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { cn } from '../utils/helpers';