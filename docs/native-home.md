# Taking over the Home button (not included)

**Serif Home doesn't change the remote's Home button or the TV's startup settings.** Samsung doesn't let a normal app take over the Home button. This page explains what that would involve, so you can make an informed choice later.

## What CleanFrame did

On its reference 2024 Frame, CleanFrame made the physical Home button open its launcher. It used a one-off helper with these steps:

1. Upload a small .NET program to the TV over the developer connection (SDB).
2. Run it as Samsung's SDK user (UID 901), using an **undocumented workaround** in how the TV's installer handles package file names. No root access.
3. Assign the launcher to the native Home operation (`http://tizen.org/appcontrol/operation/main`) and set the `db/appfw/home_appid` and Home-autostart (`db/menu/smart_hub/ontvsetting/auto_start`) settings.
4. Before writing anything, save the exact original values, so a matching **restore** command can put them back.

The CleanFrame maintainer confirmed that Home-from-Netflix returned to the launcher, and that restore and reapply worked. Behaviour when powering on after streaming or after Ambient Mode was still being checked.

## How it relates to your TV

| | CleanFrame's helper requires | Your TV |
| --- | --- | --- |
| Firmware | `T-PTMDUABC-0090-2130.0` | `T-PTMDUABC-0090-2130.0` ✅ same |
| Model | `QA55LS03DAWXXY` (Frame) | `QA55LS01DAWXXY` (Serif) ❌ different |
| Target app | `nClrkHome1.FrameHome` | `yw2bHzEqX6.SerifHome` ❌ different |

The helper refuses to run unless all three match. That's deliberate, and the right behaviour. Matching firmware makes your TV the closest candidate anyone has, but it doesn't prove the method works on a Serif.

## The risks

- **It relies on undocumented behaviour.** A firmware update can stop it working, or stop the **restore** from working.
- **Home can end up broken.** Uninstalling the launcher before restoring could leave Home pointing at a missing app. Recovery may need more technical work, a factory reset or Samsung support.
- **Apply and restore use the same connection.** If the developer connection stops working, there's no independent way back.

## If you decide to try it later

Treat it as a separate project, run with a coding agent on your own computer, and stop at the first difference. In outline:

1. Get Serif Home installed and working ([setup guide](setup-guide.md), Stages 1–6), and confirm Settings → Samsung Smart Hub opens Smart Hub on your TV.
2. Read CleanFrame's [native Home notes](https://github.com/nthnclrk/CleanFrame/blob/main/scripts/native-home/README.md) and [setup guide Stages 7–8](https://github.com/nthnclrk/CleanFrame/blob/main/docs/agent-tv-setup-guide.md#stage-7-prepare-the-optional-native-home-change).
3. Adapt the model and app-ID guards for your TV only. Keep the firmware guard.
4. Run a **query** first, and back up your TV's original values somewhere outside the project.
5. Apply once, then **restore** and confirm the values and the physical Home button. Reapply only if restore worked.

Until then, the low-risk alternative is **Autorun Last App** ([setup guide, Stage 7](setup-guide.md#stage-7--make-it-your-everyday-screen-low-risk)).
