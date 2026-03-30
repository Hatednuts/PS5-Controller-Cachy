# DualSense GUI

A modern, full-stack graphical user interface for `dualsensectl`, designed specifically for Arch Linux and CachyOS (Wayland/X11). This application allows you to manage your PS5 DualSense controller settings through a beautiful, intuitive dashboard instead of the terminal.

![DualSense GUI](https://picsum.photos/seed/dualsense/1200/600)

## Features

- **Device Selection**: Automatically detects and lists connected DualSense controllers.
- **Lightbar Customization**: Full RGB color picker with real-time brightness control.
- **Audio Management**: Adjust speaker/headphone volume and toggle the built-in microphone.
- **Adaptive Triggers**: Apply advanced trigger effects like Weapon, Bow, Galloping, and Vibration presets.
- **Battery Monitoring**: View real-time battery percentage.
- **System Integration**: One-click installation to your system's application menu.

## Prerequisites

Before installing, ensure you have the following dependencies on your system:

1.  **dualsensectl**: The core utility for controlling the DualSense.
    ```bash
    # On Arch/CachyOS
    sudo pacman -S dualsensectl
    ```
2.  **Node.js & npm**: Required to run the application server and frontend.
    ```bash
    sudo pacman -S nodejs npm
    ```

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Hatednuts/PS5-Controller-Cachy.git
cd PS5-Controller-Cachy
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Build the Application
Compile the frontend assets for production:
```bash
npm run build
```

## Usage

### Running the App
To start the server and open the GUI in your browser:
```bash
npm run start
```
The app will be accessible at `http://localhost:36364`.

### Install as a System App
To make DualSense GUI appear in your system's application menu (GNOME, KDE, etc.):
```bash
npm run install-desktop
```
After running this, you can launch "DualSense GUI" directly from your desktop launcher.

## Uninstallation

### Remove System App
To remove the application from your system menu:
```bash
npm run uninstall-desktop
```

### Clean Build Files
To remove the compiled frontend assets:
```bash
npm run clean
```

### Complete Removal
To completely remove the project:
1. Run the uninstallation script above.
2. Delete the project folder:
```bash
cd ..
rm -rf PS5-Controller-Cachy
```

## Troubleshooting

### Permissions (udev rules)
If the app cannot detect your controller or commands fail, you likely need to set up udev rules so your user can access the device without `root` privileges.

1.  Add your user to the `input` group:
    ```bash
    sudo usermod -aG input $USER
    ```
2.  Ensure udev rules are active. If you installed `dualsensectl` via `pacman`, this is usually done for you. If not, refer to the [dualsensectl documentation](https://github.com/nowrep/dualsensectl).

## License

This project is licensed under the Apache-2.0 License.
