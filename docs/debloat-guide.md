# Cut the ads and tracking

You can't uninstall Samsung's firmware or its built-in apps, but you can switch off most of the tracking, keep the ad-heavy Smart Hub out of your way, and block Samsung's ad and tracking servers on your network. Do these in order; each one helps on its own.

| Step | Effort | What it does |
| --- | --- | --- |
| 1. Privacy settings on the TV | 5 minutes | Stops viewing-data collection (ACR) and ad personalisation |
| 2. Start-up settings | 2 minutes | Stops the TV opening on Smart Hub's ad rows |
| 3. Serif Home | About an hour ([setup guide](setup-guide.md)) | A clean home screen with only your apps |
| 4. Network blocking | 15 minutes plus a DNS service | Blocks ad and tracking servers |

## 1. Privacy settings on the TV

On 2024 models these are usually under **Settings → All Settings → General & Privacy → Terms & Privacy**, in a section called **Privacy Choices**. Older guides put them under **Support → Terms & Policy**. If you can't find them, search **"privacy"** in Settings. CleanFrame's TV, on the same firmware, has a `PrivacyChoices` component, so the **Privacy Choices** name probably applies to yours too.

Turn these **off**:

| Setting | What it is |
| --- | --- |
| **Viewing Information Services** | Automatic content recognition (ACR): the TV identifies what's on screen, including from HDMI devices and antenna, and reports it |
| **Interest-Based Advertisement** | Ad profiling based on what you watch. You still see ads, but they aren't targeted |
| **Voice Recognition Services** (and any voice "improvement" option) | Cloud processing of voice commands. Bixby or Alexa voice control may stop working |
| Optional marketing items, such as **Marketing Information** or **Personalised recommendations** | Promotional messages and personalised suggestions |

**Leave the main Smart Hub / Terms & Conditions agreement accepted.** Withdrawing it disables apps, including Netflix and YouTube, and Serif Home's app launching.

**Re-check after every firmware update.** Some owners report that updates have switched these back on.

## 2. Start-up settings

Find **Start Screen Option** under **General & Privacy**, or search **"start"** in Settings:

- **Start with Smart Hub Home:** off
- **Autorun Last App:** on. Together with Serif Home, this lets the TV wake to your own screen ([setup guide, Stage 7](setup-guide.md#stage-7--make-it-your-everyday-screen-low-risk)).

While you're in Settings, you may also want to check:

- **Samsung TV Plus:** Samsung's free, ad-supported channels. If the TV keeps tuning to them, look under **Broadcasting** or **Channel** settings for a Samsung TV Plus option.
- **Notifications:** search **"notification"** in Settings and switch off promotional notifications.
- **Auto Update (apps):** your choice. Leaving it on is better for security.

## 3. Replace the home screen

Install **Serif Home** using the [setup guide](setup-guide.md). It shows a clock and your chosen apps on a calm background. It never contacts the internet, and it has no ads, banners or tracking. The remote's Home button still opens Smart Hub; [native-home.md](native-home.md) explains why, and what replacing it would involve.

## 4. Block ad and tracking servers on your network

This catches what the settings miss. It also covers other devices if you apply it router-wide.

### Easiest: NextDNS

1. Create a free [NextDNS](https://nextdns.io) profile.
2. Under **Privacy → Native Tracking Protection**, add **Samsung**. Optionally, also add the blocklist below under **Denylist**.
3. On the TV: **Settings → All Settings → Connection (or General & Privacy) → Network → Network Status → IP Settings → DNS setting → Enter manually**. Enter the IPv4 DNS address NextDNS shows for your profile under **Setup → Linked IP**, and link your IP there. Alternatively, set NextDNS on your router.

### Pi-hole or AdGuard Home

If you run [Pi-hole](https://pi-hole.net) or [AdGuard Home](https://adguard.com/adguard-home/overview.html) at home, add one of these lists:

| File | Use with |
| --- | --- |
| [`blocklists/samsung-ads-tracking.txt`](../blocklists/samsung-ads-tracking.txt) | Pi-hole (one domain per line) |
| [`blocklists/samsung-ads-tracking.adguard.txt`](../blocklists/samsung-ads-tracking.adguard.txt) | AdGuard Home and NextDNS (`\|\|domain^` rules, which also block subdomains) |

Then point the TV's DNS at your Pi-hole or AdGuard Home as described above, or let your router hand it out.

These lists are deliberately **conservative**. They cover ad delivery, viewing-data collection and error-dump uploads, so streaming apps, the app store, sign-in and firmware updates keep working. For a much stricter list, see [Perflyst's Smart-TV blocklist](https://github.com/Perflyst/PiHoleBlocklist/blob/master/SmartTV.txt). Its authors warn that it can stop the TV receiving updates or break some apps. **Don't block `samsungcloudsolution.com` or `samsungotn.net` wholesale**: those carry the app store, account services and firmware updates.

### Check it's working

After a day, your Pi-hole or AdGuard Home query log should show blocked requests from the TV's IP to `samsungads.com` or `samsungacr.com`. If an app breaks, look in the log for what was blocked when it failed, and allow that domain.

## What can't be removed

- Samsung's firmware and built-in apps (Smart Hub, Samsung TV Plus, Gaming Hub and others). Samsung TVs only run firmware signed by Samsung.
- The remote's Home button going to Smart Hub, unless you take on the [native Home experiment](native-home.md).
- Ads **inside** streaming apps, such as YouTube's video ads. Those come from the app's own servers, and DNS blocking can break the app.

## Sources

- [Tom's Guide: turn off Samsung TV data collection](https://www.tomsguide.com/tvs/your-samsung-tv-is-watching-you-how-to-turn-off-data-collection)
- [Security Boulevard: disabling ACR on Samsung TVs (2026)](https://securityboulevard.com/2026/03/samsung-tvs-stop-spying-on-viewers-in-texas-heres-how-to-disable-acr-anywhere/)
- [Perflyst Smart-TV blocklist](https://github.com/Perflyst/PiHoleBlocklist/blob/master/SmartTV.txt)
- [CleanFrame](https://github.com/nthnclrk/CleanFrame): start-up settings recorded on the same firmware
