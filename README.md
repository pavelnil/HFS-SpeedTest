# [HFS-SpeedTest](../../releases/) Plugin for HTTP File Server

---

## **Description**
[**HFS-SpeedTest**](../../releases/) is a plugin for **HTTP File Server version 3 (HFS 3)** designed to measure connection speed to the server. It provides network quality insights, including **latency (ping)**, **jitter**, **download/upload speeds**, with real-time visualization of results.

---

## **Key Features**:
1. **Comprehensive Network Testing**:
   - **Ping** and **jitter** measurement
   - **Download** speed testing
   - **Upload** speed testing
   - Real-time **speed graphs**

2. **Identification of Network**:
   - Automatic detection of public **IPv4/IPv6**
   - **IP-based geolocation** (country/city) via [ipify.org](https://www.ipify.org) and [ipwho.is](https://ipwho.is) (optional)
   - Detection of **public IPs** within the **same network as HFS**

3. **Adaptive Testing Algorithm**:
   - Automatic **calibration** based on connection speed
   - Dynamic chunk sizing from **50KB** to **100MB**
   - Optimized for low-speed and high-speed connections

4. **Security & Access Control**:
   - Access restriction by **users/groups**
   - Support for **anonymous** access (optional)
   - **Secured endpoints** for testing

5. **Performance Optimization**:
   - Pre-generated data buffer (**100 MB**)
   - Automatic buffer cleanup after **30 minutes** of plugin inactivity
   - **Recreating the buffer** (if auto-cleared) before beginning further testing.
   - Minimal server load

---

## **Plugin Settings**:

![screenshot5](../../blob/main/screenshots/screenshot5.jpg)

## **Installation**:
1. Copy the plugin folder to the `\plugins` directory in **HFS**
2. **Activate** the plugin via the HFS web interface
3. Configure parameters in the **Options** section

## **Usage**:
1. Navigate to the configured URL (default: `/speedtest`)
2. Click **"Start"** to initiate the test

## **Technical Details**:
- Uses [Chart.js](https://github.com/chartjs/Chart.js) for visualization
- **Optimal** memory consumption
- **Geodata caching** (7 days)
- **Dark/light theme** support
- Fully **responsive** interface
- **UX**: Animations, hover effects

![screenshot1](../../blob/main/screenshots/screenshot1.jpg)
![screenshot2](../../blob/main/screenshots/screenshot2.jpg)
![screenshot3](../../blob/main/screenshots/screenshot3.jpg)
![screenshot4](../../blob/main/screenshots/screenshot4.jpg)

---
Support:
* BTC: `bc1qeuq7s8w0x7ma59mwd4gtj7e9rjl2g9xqvxdsl6`
* TON: `UQAOQXGtTi_aM1u54aQjb8QiXZkQdaL9MDSky5LHN0F5-yF2`

