<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $ownerName }} shared "{{ $shareName }}" with you</title>
</head>
<body style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.5;">
    <p>Hi,</p>

    <p>
        <strong>{{ $ownerName }}</strong> has shared
        <strong>{{ $shareName }}</strong> with you
        @if ($canWrite)
            and you can view and upload files.
        @else
            so you can view and download it.
        @endif
    </p>

    <p>To confirm your access, click the button below:</p>

    <p>
        <a href="{{ $confirmUrl }}"
           style="display: inline-block; padding: 10px 18px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px;">
            Confirm access
        </a>
    </p>

    <p>If the button does not work, copy and paste this link into your browser:</p>
    <p style="word-break: break-all;"><a href="{{ $confirmUrl }}">{{ $confirmUrl }}</a></p>

    <p>If you weren't expecting this, you can safely ignore this email.</p>
</body>
</html>
