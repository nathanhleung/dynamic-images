import { Resvg } from '@resvg/resvg-js';
import axios from 'axios';
import mime from 'mime-types';
import type { NextApiRequest, NextApiResponse } from 'next'
import React from 'react';
import satori from 'satori';

import fontNormalData from '../../assets/font-normal.json';
import fontBoldData from '../../assets/font-bold.json';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

async function getCurrentLocation() {
  const res = await axios.get("https://natecation.com/site-metadata.json");
  return res.data.currentLocation;
}

async function getLatLng(location: string) {
  const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?&address=${encodeURIComponent(location)}&key=${GOOGLE_MAPS_API_KEY}`
  const res = await axios.get(apiUrl);
  return res.data.results[0].geometry.location;
}

async function getUtcOffset(lat: number, lng: number) {
  const apiUrl = `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${Math.floor(Date.now() / 1000)}&key=${GOOGLE_MAPS_API_KEY}`;
  const res = await axios.get(apiUrl);
  return Math.round((res.data.rawOffset + res.data.dstOffset) / 3600 * 100) / 100;
}

type BoxProps = JSX.IntrinsicElements['div'];
const Box: React.FC<BoxProps> = ({ style, ...restProps }) => {
  return <div style={{
    display: 'flex',
    ...style,
  }} {...restProps} />
}

type TextProps = JSX.IntrinsicElements['p'];
const Text: React.FC<TextProps> = ({ style, ...restProps }) => {
  return <p style={{
    margin: 0,
    ...style
  }} {...restProps} />
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  let currentLocation = "Los Angeles, CA";
  try {
    currentLocation = await getCurrentLocation();
  } catch { }


  let utcOffset = null;
  if (req.query.timezone === "true") {
    try {
      const { lat, lng } = await getLatLng(currentLocation);
      utcOffset = await getUtcOffset(lat, lng)
    } catch (e) {
      console.log(e);
    }
  }
  const utcOffsetString = utcOffset != null ? ` (UTC${utcOffset > 0 ? '+' : ''}${utcOffset})` : '';

  const svg = await satori(
    <Box
      style={{
        width: '100%',
        height: '100%',
        alignItems: 'flex-start',
        justifyContent: 'center',
        flexDirection: 'column',
        fontFamily: 'Default',
        fontSize: '24px',
        background: req.query.background || 'white',
      }}
    >
      <Text style={{ fontWeight: 700 }}>Nathan H. Leung</Text>
      <Box style={{ alignItems: 'center' }}>
        <Text>
          {currentLocation}{utcOffsetString} &middot;
        </Text>
        <Text style={{
          marginTop: '4px',
          marginLeft: '6px',
          color: 'rgb(32, 150, 255)',
          borderBottomColor: 'rgba(32, 150, 255, 0.2)',
          borderBottomWidth: '5px',
          borderBottomStyle: 'solid',
          lineHeight: '28px',
        }}>
          natecation.com
        </Text>
      </Box>
    </Box>,
    {
      width: 600,
      height: 80,
      fonts: [
        { name: 'Default', data: Buffer.from(fontNormalData.map(i => Math.round((i - 1) / 2))), weight: 400 },
        {
          name: 'Default', data: Buffer.from(fontBoldData.map(i => Math.round((i - 1) / 2))), weight: 700
        }
      ],

    }
  );

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'original'
    },
  })

  res.status(200).setHeader("content-type", mime.lookup('.png')).end(resvg.render().asPng());
}