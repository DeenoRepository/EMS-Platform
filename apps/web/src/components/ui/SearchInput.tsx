'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TextField, InputAdornment, IconButton, Box, Chip } from '@mui/material';
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

  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  useEffect(() => {
    onSearch(debouncedValue);
  }, [debouncedValue, onSearch]);

  const handleClear = () => {
    setInternalValue('');
    onSearch('');
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
            <SearchIcon sx={{ color: '#0284c7', fontSize: 19 }} />
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            {internalValue ? (
              <IconButton size="small" onClick={handleClear} aria-label="Очистить поиск" sx={{ p: 0.25 }}>
                <CloseIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
              </IconButton>
            ) : shortcutHint ? (
              <Chip
                label={shortcutHint}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  borderRadius: '4px',
                }}
              />
            ) : null}
          </InputAdornment>
        ),
        sx: {
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          fontSize: '0.8125rem',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#e2e8f0',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#cbd5e1',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#0284c7',
            borderWidth: '1.5px',
          },
        },
      }}
    />
  );
}
