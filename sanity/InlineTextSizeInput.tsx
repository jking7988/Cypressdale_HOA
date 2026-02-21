// @ts-nocheck
import React from 'react'
import {set} from 'sanity'
import {Button, Flex, Text, TextInput} from '@sanity/ui'

const MIN_SIZE = 10
const MAX_SIZE = 64

function clamp(n: number) {
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(n)))
}

export default function InlineTextSizeInput(props: any) {
  const {value, onChange, readOnly} = props
  const current = Number.isFinite(value) ? Number(value) : 16

  function update(next: number) {
    onChange(set(clamp(next)))
  }

  return (
    <Flex align="center" gap={2}>
      <Button
        mode="ghost"
        text="-"
        disabled={readOnly || current <= MIN_SIZE}
        onClick={() => update(current - 1)}
      />
      <TextInput
        type="number"
        value={String(current)}
        readOnly={readOnly}
        onChange={(e) => update(Number(e.currentTarget.value || 16))}
        style={{maxWidth: 88}}
      />
      <Button
        mode="ghost"
        text="+"
        disabled={readOnly || current >= MAX_SIZE}
        onClick={() => update(current + 1)}
      />
      <Text size={1}>px</Text>
    </Flex>
  )
}

