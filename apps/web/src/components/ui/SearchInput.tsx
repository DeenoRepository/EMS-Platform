'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  CircularProgress,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { useDebounce } from '@/hooks/useDebounce';

export interface SearchInputProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  delay?: number;
  onSearch: (value: string) => void;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  shortcutHint?: string;
  enableGlobalShortcut?: boolean;
  className?: string;
}

export function SearchInput({
  value: controlledValue,
  defaultValue = '',
  placeholder = 'Поиск...',
  delay = 300,
  onSearch,
  fullWidth = true,
  size = 'small',
  shortcutHint = 'Ctrl+K',
  enableGlobalShortcut = true,
  className,
}: SearchInputProps) {
  const theme = useTheme();
  const [internalValue, setInternalValue] = useState(controlledValue !== undefined ? controlledValue : defaultValue);
  const debouncedValue = useDebounce(internalValue, delay);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDebouncing = internalValue !== debouncedValue;

  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  const isMounted = useRef(false);
  const prevDebouncedValue = useRef(debouncedValue);

  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
      prevDebouncedValue.current = controlledValue;
    }
  }, [controlledValue]);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (prevDebouncedValue.current !== debouncedValue) {
      prevDebouncedValue.current = debouncedValue;
      onSearchRef.current(debouncedValue);
    }
  }, [debouncedValue]);

  // Global shortcut (Ctrl+K or Cmd+K) to focus input
  useEffect(() => {
    if (!enableGlobalShortcut) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        const activeElement = document.activeElement;
        const isInputField = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
        if (!isInputField || activeElement === inputRef.current) {
          e.preventDefault();
          inputRef.current?.focus();
          inputRef.current?.select();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableGlobalShortcut]);

  const handleClear = () => {
    setInternalValue('');
    prevDebouncedValue.current = '';
    onSearchRef.current('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (internalValue) {
        handleClear();
      } else {
        inputRef.current?.blur();
      }
    }
  };

  return (
    <TextField
      inputRef={inputRef}
      className={className}
      value={internalValue}
      onChange={(e) => setInternalValue(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      size={size}
      fullWidth={fullWidth}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            {isDebouncing ? (
              <CircularProgress size={16} color="primary" sx={{ mr: 0.5 }} />
            ) : (
              <SearchIcon sx={{ color: 'primary.main', fontSize: 19 }} />
            )}
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            {internalValue ? (
              <IconButton size="small" onClick={handleClear} aria-label="Очистить поиск" sx={{ p: 0.25 }}>
                <CloseIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
              </IconButton>
            ) : shortcutHint ? (
              <Chip
                label={shortcutHint}
                size="small"
                onClick={() => inputRef.current?.focus()}
                sx={{
                  height: 18,
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  backgroundColor: 'action.hover',
                  color: 'text.secondary',
                  borderRadius: '4px',
                  border: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.selected',
                  },
                }}
              />
            ) : null}
          </InputAdornment>
        ),
        sx: {
          backgroundColor: 'background.paper',
          borderRadius: '8px',
          fontSize: '0.8125rem',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'divider',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'grey.400',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'primary.main',
            borderWidth: '1.5px',
          },
        },
      }}
    />
  );
}
