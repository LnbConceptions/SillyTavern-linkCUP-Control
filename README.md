# linkCUP Interface Plugin for SillyTavern

This plugin allows SillyTavern to connect to linkCUP devices via Bluetooth and report user activity to AI characters.

## Features

1. Connect to linkCUP devices via Web Bluetooth
2. Display real-time data from the device in the SillyTavern interface
3. Send periodic action reports to AI characters every 5 seconds
4. Allow AI characters to respond to user actions based on the reported data

## Installation

1. Place this plugin folder in your SillyTavern plugins directory
2. Enable server plugins in your SillyTavern config.yaml file by setting `enableServerPlugins: true`
3. Restart SillyTavern
4. The plugin should appear in the Extensions menu

## Usage

1. In the Extensions menu, find the "linkCUP" plugin
2. Click the "Connect linkCUP" button
3. Select your linkCUP device from the Bluetooth device list
4. Once connected, the plugin will display real-time data from the device
5. Every 5 seconds, an action report will be sent to the AI character
6. The AI character will respond to these action reports based on their programming

## Data Reported

Every 5 seconds, the plugin sends a system message to the AI character with the following data:
- Current position
- Number of thrusts in the last 5 seconds
- Intensity of movements
- Character excitement level

## Technical Details

The plugin consists of two parts:
1. A server plugin (plugin.js) that serves the client-side files
2. A client-side extension (public/script.js) that handles the Bluetooth connection and UI

The plugin uses the PaperPlane class (paperplane.js) to process the raw data from the device and calculate meaningful metrics.
