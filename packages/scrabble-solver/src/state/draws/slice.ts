import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { type DrawsResult } from '@/types';

import { drawsInitialState } from './initialState';

export const drawsSlice = createSlice({
  initialState: drawsInitialState,
  name: 'draws',
  reducers: {
    changeResults: (_state, action: PayloadAction<DrawsResult>) => {
      const { baseline, draws } = action.payload;
      return { baseline, results: draws };
    },

    reset: () => drawsInitialState,
  },
});
