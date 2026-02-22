// @ts-nocheck
import React from 'react'
import {set} from 'sanity'
import {Button, Flex, Text, TextInput} from '@sanity/ui'

const MIN_WEIGHT = 100
const MAX_WEIGHT = 900
const STEP = 100

function clamp(n: number) {
  const rounded = Math.round(n / STEP) * STEP
  return Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, rounded))
}

export default function InlineTextWeightInput(props: any) {
  const {value, onChange, readOnly} = props
  const current = Number.isFinite(value) ? Number(value) : 600

  function update(next: number) {
    onChange(set(clamp(next)))
  }

  return (
    <Flex align="center" gap={2}>
      <Button
        mode="ghost"
        text="-"
        disabled={readOnly || current <= MIN_WEIGHT}
        onClick={() => update(current - STEP)}
      />
      <TextInput
        type="number"
        value={String(current)}
        readOnly={readOnly}
        onChange={(e) => update(Number(e.currentTarget.value || 600))}
        style={{maxWidth: 88}}
      />
      <Button
        mode="ghost"
        text="+"
        disabled={readOnly || current >= MAX_WEIGHT}
        onClick={() => update(current + STEP)}
      />
      <Text size={1}>wt</Text>
    </Flex>
  )
}
