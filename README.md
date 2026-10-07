# AgniAction

Turning satellite fire observations into actionable environmental intelligence

AgniAction is a web application that makes satellite-detected fire activity easier to explore, understand, and analyse.

It uses NASA FIRMS fire observations and turns them into an interactive experience where users can explore historical fire activity, select specific dates, identify concentrated activity, and inspect individual fire locations.

The goal is to make important fire information easier to interpret for environmental monitoring, fire management, disaster response, research, and decision-making.

---
 The Problem

Fire activity can cause serious environmental damage, including vegetation loss, ecosystem damage, air pollution, and greenhouse-gas emissions.

However, satellite fire data can be difficult to interpret when presented as large amounts of raw observations.

Users need to quickly understand:

- Where fire activity is occurring
- When it is occurring
- How frequently activity is detected at a location
- Where activity is concentrated
- How fire activity changes across different dates

AgniAction addresses this gap by converting satellite observations into a simpler, interactive map-based analysis experience.

---

 The Solution

AgniAction provides an interactive map and analysis interface built around satellite fire observations.

The application includes a predefined historical view covering observations from November 1 in 2020, 2021, and 2022.

Users can explore this historical dataset or use Explore by Date to select their own date or date range.

Users can also select an individual fire point on the map to view information such as:

- Coordinates
- Associated observations/activity
- How frequently fire activity has been detected around that location

The application also generates summaries from the active dataset, helping users understand the overall pattern without manually examining every individual observation.

---

 How It Works

NASA FIRMS
     ↓
Secure Server-side Retrieval
     ↓
AgniAction Data Processing
     ↓
Filtering & Analysis
     ↓
Interactive Map
     ↓
Summaries & Location Details

The application processes the active dataset to calculate information such as observation counts, dates, recurring activity, and concentrated areas.

The same analysis system works with the predefined historical data as well as the date range selected by the user.

---

🛰️ NASA FIRMS Data

AgniAction uses NASA's Fire Information for Resource Management System (FIRMS) and VIIRS Suomi NPP Standard Processing observations.

When available, the application retrieves actual NASA FIRMS data through a server-side Node.js proxy / Netlify Function.

The NASA API key is kept on the server and is never placed directly in browser-side JavaScript.

If the NASA request is unavailable or fails, AgniAction automatically uses a locally stored fallback dataset so that the application remains usable.

The fallback records are synthetic illustrative data and are clearly distinguished from actual NASA observations.

---

Climate & Environmental Impact

Fire activity can have significant environmental and climate consequences through vegetation loss, ecosystem damage, air pollution, and greenhouse-gas emissions.

AgniAction contributes by making fire activity easier to monitor and understand.

It helps users identify:

- Areas showing fire activity
- Recurring activity around locations
- Concentrations of detected fire observations
- Historical patterns across dates
- Areas that may require closer attention

This can support better monitoring, prioritisation, environmental analysis, and fire-management decisions.

AgniAction does not claim that the application itself prevents fires or directly reduces greenhouse-gas emissions. Its contribution is providing clearer, more accessible information from satellite observations to support better decisions.

---

Who Can Benefit?

Forest & Fire-Management Teams

Can use the application to identify recurring and concentrated fire activity and improve monitoring priorities.

Government & Local Authorities

Can use the information to improve situational awareness and support environmental decision-making.

Disaster-Management Teams

Can understand the geographic distribution and historical pattern of detected fire activity.

Environmental Organisations

Can explore areas showing recurring or concentrated activity that may require attention.

Researchers & Analysts

Can use historical and date-based exploration to study fire patterns.

---

Key Features

- Historical Fire View — Explore the predefined three-year fire dataset.
- Explore by Date — Select a specific date or custom date range.
- Interactive Fire Map — Explore the geographic distribution of observations.
- Fire Point Details — Select individual locations to inspect their coordinates and associated activity.
- Recurring Activity Analysis — Understand how frequently activity has been detected around locations.
- Automatic Summaries — Get an overview of the active dataset.
- Spatial Analysis — Identify areas where observations are concentrated.
- Historical Comparison — Explore activity across the predefined historical years.
- Real NASA Data — Uses actual NASA FIRMS observations when available.
- Reliable Fallback — Maintains functionality through locally stored fallback data when the external NASA service is unavailable.

---

Data Reliability & Limitations

AgniAction is an exploration and decision-support tool based on satellite observations.

A NASA FIRMS detection should not automatically be interpreted as confirmed ground-level fire. Satellite observations can have limitations and may be affected by factors such as cloud cover or other thermal sources.

The application therefore focuses on identifying and analysing observed patterns, rather than claiming to establish the exact cause of an event.

The current map also does not include road or settlement context.

---

Data & API Security

NASA FIRMS access is handled through a server-side layer rather than exposing the API key in the frontend.

The application follows this approach:

User
 ↓
AgniAction Frontend
 ↓
Server-side Function / Proxy
 ↓
NASA FIRMS API
 ↓
Processed Data
 ↓
Interactive Application

This keeps the NASA API key away from publicly accessible browser code.

---

Technology

- JavaScript
- Node.js
- NASA FIRMS API
- VIIRS Suomi NPP data
- Server-side proxy / Netlify Function
- Interactive mapping
- Data filtering and analysis
- Local fallback dataset

---

License

MIT License

Copyright (c) 2026 AgniAction

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
