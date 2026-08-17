'use client';

import React from 'react';
import { Typography, TypographyProps } from '@mui/material';

export interface CurrencyDisplayProps extends Omit<TypographyProps, 'children'> {
  amount: number | null | undefined;
  currency?: 'KZT' | 'RUB' | 'USD' | 'EUR' | string;
  compact?: boolean;
  showSign?: boolean;
  colorSemantic?: boolean;
  fractionDigits?: number;
  className?: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  KZT: '₸',
  RUB: '₽',
  USD: '$',
  EUR: '€',
};

export function CurrencyDisplay({
  amount,
  currency = 'KZT',
  compact = false,
  showSign = false,
  colorSemantic = false,
  fractionDigits = 0,
  className,
  ...typographyProps
}: CurrencyDisplayProps) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return (
      <Typography
        component="span"
        color="text.secondary"
        className={className}
        {...typographyProps}
      >
        —
      </Typography>
    );
  }

  const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()] || currency;
  const isNegative = amount < 0;
  const isPositive = amount > 0;

  let formattedNumber = '';

  if (compact && Math.abs(amount) >= 1_000_000) {
    formattedNumber = `${(amount / 1_000_000).toLocaleString('ru-RU', {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    })} млн`;
  } else if (compact && Math.abs(amount) >= 1_000) {
    formattedNumber = `${(amount / 1_000).toLocaleString('ru-RU', {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    })} тыс.`;
  } else {
    formattedNumber = amount.toLocaleString('ru-RU', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  }

  const sign = showSign && isPositive ? '+' : '';

  let colorStyle = typographyProps.color;
  if (colorSemantic) {
    if (isNegative) colorStyle = 'error.main';
    else if (isPositive) colorStyle = 'success.main';
  }

  return (
    <Typography
      component="span"
      className={className}
      sx={{
        fontFeatureSettings: '"tnum"',
        fontWeight: typographyProps.fontWeight || 600,
        ...typographyProps.sx,
      }}
      color={colorStyle}
      {...typographyProps}
    >
      {sign}
      {formattedNumber} {symbol}
    </Typography>
  );
}
