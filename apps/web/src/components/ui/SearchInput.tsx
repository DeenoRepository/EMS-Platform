'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TextField, InputAdornment, IconButton, Chip } from '@mui/material';
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
  shortcutHint,
  className,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(controlledValue !== undefined ? controlledValue : defaultValue);
  const debouncedValue = useDebounce(internalValue, delay);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleClear = () => {
    setInternalValue('');
    prevDebouncedValue.current = '';
    onSearchRef.current('');
    inputRef.current?.focus();
  };

  return (
    <TextField
      inputRef={inputRef}
      className={className}
      value={internalValue}
      onChange={(e) => setInternalValue(e.target.value)}
      placeholder={placeholder}
      size={size}
      fullWidth={fullWidth}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ color: 'primary.main', fontSize: 19 }} />
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
                sx={{
                  height: 18,
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  backgroundColor: 'action.hover',
                  color: 'text.secondary',
                  borderRadius: '4px',
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
            borderColor: 'text.disabled',
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
