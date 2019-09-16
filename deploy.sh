#!/bin/sh
rm -rf public
mkdir public && \
npm run build && \
hugo && \
cp headers.netlify public/_headers && \
netlify deploy --prod -d public
