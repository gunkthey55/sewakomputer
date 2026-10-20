import { useState, useRef, useEffect, forwardRef } from 'react';
import { format, parse, isValid, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isBefore, isAfter } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import { cn } from '../utils/helpers';
import { Button } from './Button';
import { Input } from './Input';

export interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: Date | string | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  showTime?: boolean;
  minDate?: Date;
  maxDate?: Date;
  label?: string;
  error?: string;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ value, onChange, placeholder = 'Select date', disabled, showTime, minDate, maxDate, label, error, className, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(value ? new Date(value) : null);
    const inputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (value) {
        const date = new Date(value);
        if (isValid(date)) {
          setSelectedDate(date);
          setCurrentMonth(date);
        }
      } else {
        setSelectedDate(null);
      }
    }, [value]);

    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const formatDate = (date: Date) => {
      return showTime ? format(date, 'MMM d, yyyy HH:mm') : format(date, 'MMM d, yyyy');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const date = e.target.value ? parse(e.target.value, showTime ? 'MMM d, yyyy HH:mm' : 'MMM d, yyyy', new Date()) : null;
      if (date && isValid(date)) {
        setSelectedDate(date);
        onChange?.(date);
      } else if (!e.target.value) {
        setSelectedDate(null);
        onChange?.(null);
      }
    };

    const handleDayClick = (day: Date) => {
      if (minDate && isBefore(day, startOfDay(minDate))) return;
      if (maxDate && isAfter(day, endOfDay(maxDate))) return;
      
      const newDate = showTime ? new Date(day) : day;
      if (selectedDate && showTime) {
        newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
      }
      setSelectedDate(newDate);
      onChange?.(newDate);
      setIsOpen(false);
    };

    const handleTimeChange = (field: 'hours' | 'minutes', value: number) => {
      if (!selectedDate) return;
      const newDate = new Date(selectedDate);
      if (field === 'hours') newDate.setHours(value);
      else newDate.setMinutes(value);
      setSelectedDate(newDate);
      onChange?.(newDate);
    };

    const daysInMonth = () => {
      const start = startOfWeek(startOfMonth(currentMonth));
      const end = endOfWeek(endOfMonth(currentMonth));
      const days: Date[] = [];
      let day = start;
      while (day <= end) {
        days.push(day);
        day = addDays(day, 1);
      }
      return days;
    };

    const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

    return (
      <div ref={wrapperRef} className="relative w-full">
        {label && (
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            ref={(el) => { inputRef.current = el; if (ref) ref.current = el; }}
            type="text"
            value={selectedDate ? formatDate(selectedDate) : ''}
            onChange={handleInputChange}
            onClick={() => !disabled && setIsOpen(true)}
            onFocus={() => !disabled && setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'pl-10 flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-destructive focus-visible:ring-destructive',
              className
            )}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            {...props}
          />
          {selectedDate && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onChange?.(null); setSelectedDate(null); }}
              aria-label="Clear date"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {error && <p className="mt-1.5 text-sm text-destructive" role="alert">{error}</p>}

        {isOpen && !disabled && (
          <div className="absolute z-50 mt-1 w-full max-w-sm rounded-lg border bg-card p-3 shadow-lg animate-slide-down">
            <div className="flex items-center justify-between mb-3">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium">{format(currentMonth, 'MMMM yyyy')}</span>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-7 gap-0.5 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-0.5">
              {daysInMonth().map((day) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                const isDisabled = (minDate && isBefore(day, startOfDay(minDate))) || (maxDate && isAfter(day, endOfDay(maxDate)));
                
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    disabled={isDisabled}
                    className={cn(
                      'relative h-9 w-9 rounded-lg text-sm font-medium transition-colors',
                      !isCurrentMonth && 'text-muted-foreground/50',
                      isDisabled && 'opacity-50 cursor-not-allowed',
                      isSelected && 'bg-primary text-primary-foreground',
                      isToday && !isSelected && 'bg-primary/10 text-primary font-bold',
                      !isSelected && !isToday && !isDisabled && 'hover:bg-accent hover:text-accent-foreground',
                      !isSelected && !isToday && !isDisabled && 'focus:bg-accent focus:text-accent-foreground'
                    )}
                    aria-selected={isSelected}
                    aria-current={isToday ? 'date' : undefined}
                    aria-disabled={isDisabled}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>

            {showTime && selectedDate && (
              <div className="mt-3 border-t pt-3">
                <div className="flex items-center gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Hours</label>
                    <select
                      value={selectedDate.getHours()}
                      onChange={(e) => handleTimeChange('hours', parseInt(e.target.value))}
                      className="mt-1 w-20 rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Minutes</label>
                    <select
                      value={selectedDate.getMinutes()}
                      onChange={(e) => handleTimeChange('minutes', parseInt(e.target.value))}
                      className="mt-1 w-20 rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {Array.from({ length: 60 }, (_, i) => (
                        <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={() => { setIsOpen(false); }}>Done</Button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';