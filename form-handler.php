<?php
/**
 * 1:90 Align — Contact Form Handler
 * Handles all four site forms and emails submissions to contact@190align.com
 *
 * Works with the existing fetch() AJAX in main.js — returns JSON.
 * Requires a PHP host (Apache/Nginx with PHP 7.4+).
 */

// ── Configuration ────────────────────────────────────────────────────────────

define('TO_EMAIL',   'contact@190align.com');
define('FROM_EMAIL', 'noreply@190align.com');
define('FROM_NAME',  '1:90 Align Website');
define('SITE_URL',   'https://190align.com');

// Allowed origins for CORS (adjust if needed)
$allowed_origins = ['https://190align.com', 'https://www.190align.com'];


// ── Bootstrap ────────────────────────────────────────────────────────────────

header('Content-Type: application/json; charset=utf-8');

// CORS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error(405, 'Method not allowed.');
}

// Rate limiting via session (simple, no Redis needed)
session_start();
$now = time();
if (!isset($_SESSION['form_attempts'])) {
    $_SESSION['form_attempts'] = [];
}
// Keep only attempts in the last 60 seconds
$_SESSION['form_attempts'] = array_filter(
    $_SESSION['form_attempts'],
    fn($t) => ($now - $t) < 60
);
if (count($_SESSION['form_attempts']) >= 5) {
    json_error(429, 'Too many submissions. Please wait a moment and try again.');
}
$_SESSION['form_attempts'][] = $now;


// ── Input parsing ────────────────────────────────────────────────────────────

// Support both application/x-www-form-urlencoded (FormData) and application/json
$content_type = $_SERVER['CONTENT_TYPE'] ?? '';
if (str_contains($content_type, 'application/json')) {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
} else {
    $body = $_POST;
}

// ── Honeypot check ───────────────────────────────────────────────────────────

if (!empty($body['_gotcha']) || !empty($body['website'])) {
    // Silently succeed — fool the bot
    json_success();
}


// ── Identify which form was submitted ────────────────────────────────────────

$form_source = sanitise($body['form_source'] ?? 'General Enquiry');


// ── Collect and validate fields ──────────────────────────────────────────────

$errors = [];

// Common fields (used across all forms)
$name    = sanitise($body['contactName'] ?? $body['name'] ?? '');
$company = sanitise($body['companyName'] ?? $body['company'] ?? '');
$email   = sanitise($body['contactEmail'] ?? $body['email'] ?? '');
$phone   = sanitise($body['contactNumber'] ?? $body['phone'] ?? '');
$message = sanitise($body['message'] ?? $body['contactMessage'] ?? '');

// Interests (checkboxes — software.html and training.html)
$raw_interests = $body['interests'] ?? [];
$interests = array_map('sanitise', (array) $raw_interests);

// Lead-magnet / guide downloads only need name + email (lightweight capture)
$is_lead_magnet = (stripos($form_source, 'guide') !== false)
    || (stripos($form_source, 'download') !== false)
    || !empty($body['lead_magnet']);

// Validation
if (empty($name)) {
    $errors[] = 'Name is required.';
}
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'A valid email address is required.';
}
if (!$is_lead_magnet) {
    if (empty($company)) {
        $errors[] = 'Company name is required.';
    }
    if (empty($phone)) {
        $errors[] = 'Phone number is required.';
    }
}

if (!empty($errors)) {
    json_error(422, implode(' ', $errors));
}


// ── Build email ──────────────────────────────────────────────────────────────

$subject = "New Enquiry via {$form_source} — {$name}, {$company}";

// Plain-text body
$text_body  = "New enquiry submitted via the 1:90 Align website.\n";
$text_body .= "Form: {$form_source}\n";
$text_body .= str_repeat('-', 60) . "\n";
$text_body .= "Name:    {$name}\n";
$text_body .= "Company: {$company}\n";
$text_body .= "Email:   {$email}\n";
$text_body .= "Phone:   {$phone}\n";
if (!empty($interests)) {
    $text_body .= "Interests:\n";
    foreach ($interests as $interest) {
        $text_body .= "  • {$interest}\n";
    }
}
if (!empty($message)) {
    $text_body .= "\nMessage:\n{$message}\n";
}
$text_body .= str_repeat('-', 60) . "\n";
$text_body .= "Submitted: " . date('d M Y H:i:s T') . "\n";
$text_body .= "IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . "\n";

// HTML body
$html_body = html_email_template($form_source, $name, $company, $email, $phone, $interests, $message);

// Headers
$boundary = '----=_Part_' . md5(uniqid('', true));
$headers  = "From: " . FROM_NAME . " <" . FROM_EMAIL . ">\r\n";
$headers .= "Reply-To: {$name} <{$email}>\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
$headers .= "X-Form-Source: {$form_source}\r\n";

$body_combined  = "--{$boundary}\r\n";
$body_combined .= "Content-Type: text/plain; charset=UTF-8\r\n";
$body_combined .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
$body_combined .= $text_body . "\r\n\r\n";
$body_combined .= "--{$boundary}\r\n";
$body_combined .= "Content-Type: text/html; charset=UTF-8\r\n";
$body_combined .= "Content-Transfer-Encoding: quoted-printable\r\n\r\n";
$body_combined .= quoted_printable_encode($html_body) . "\r\n\r\n";
$body_combined .= "--{$boundary}--";


// ── Send ─────────────────────────────────────────────────────────────────────

$sent = mail(TO_EMAIL, $subject, $body_combined, $headers);

if (!$sent) {
    // Log for server-side debugging without exposing details to client
    error_log("[190align] mail() failed for submission from {$email} ({$form_source})");
    json_error(500, 'We could not send your message. Please email us directly at ' . TO_EMAIL);
}

// Also send an auto-reply to the sender
send_autoreply($name, $email, $form_source);

json_success();


// ── Auto-reply ───────────────────────────────────────────────────────────────

function send_autoreply(string $name, string $email, string $form_source): void
{
    $first_name = explode(' ', $name)[0];
    $subject    = "Thanks for getting in touch — 1:90 Align";

    $text = "Hi {$first_name},\n\n";
    $text .= "Thanks for reaching out. We've received your message and will be in touch within 24 hours.\n\n";
    $text .= "In the meantime, if you'd like to book a call directly:\n";
    $text .= "https://calendly.com/190align/15min\n\n";
    $text .= "Best,\nThe 1:90 Align Team\n\n";
    $text .= "---\n1:90 Align Ltd\n+44 742 820 9054\ncontact@190align.com\nhttps://190align.com\n";

    $headers  = "From: " . FROM_NAME . " <" . FROM_EMAIL . ">\r\n";
    $headers .= "Reply-To: " . TO_EMAIL . "\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";

    @mail($email, $subject, $text, $headers); // Suppress errors — auto-reply failure is non-critical
}


// ── Helpers ──────────────────────────────────────────────────────────────────

function sanitise(string $value): string
{
    return htmlspecialchars(strip_tags(trim($value)), ENT_QUOTES, 'UTF-8');
}

function json_success(): never
{
    echo json_encode(['ok' => true]);
    exit;
}

function json_error(int $status, string $message): never
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $message]);
    exit;
}

function html_email_template(
    string $form_source,
    string $name,
    string $company,
    string $email,
    string $phone,
    array  $interests,
    string $message
): string {
    $interests_html = '';
    if (!empty($interests)) {
        $items = implode('', array_map(
            fn($i) => "<li style='margin:4px 0;'>&#x2022; {$i}</li>",
            $interests
        ));
        $interests_html = "
        <tr>
          <td style='padding:10px 0;border-bottom:1px solid #e5e7eb;'>
            <strong style='color:#172554;text-transform:uppercase;font-size:12px;letter-spacing:0.05em;'>Interests</strong><br>
            <ul style='margin:8px 0 0;padding:0;list-style:none;color:#374151;font-size:15px;'>{$items}</ul>
          </td>
        </tr>";
    }

    $message_html = '';
    if (!empty($message)) {
        $msg_escaped = nl2br($message);
        $message_html = "
        <tr>
          <td style='padding:10px 0;border-bottom:1px solid #e5e7eb;'>
            <strong style='color:#172554;text-transform:uppercase;font-size:12px;letter-spacing:0.05em;'>Message</strong><br>
            <p style='margin:8px 0 0;color:#374151;font-size:15px;line-height:1.6;'>{$msg_escaped}</p>
          </td>
        </tr>";
    }

    $date = date('d M Y H:i T');

    return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e5e7eb;">

        <!-- Header -->
        <tr>
          <td style="background:#172554;padding:24px 32px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="background:#f97316;display:inline-block;padding:8px 16px;transform:skewX(-12deg);">
                    <span style="color:#172554;font-weight:900;font-size:20px;letter-spacing:-0.05em;display:inline-block;transform:skewX(12deg);">1:90</span>
                  </div>
                </td>
                <td style="padding-left:16px;">
                  <p style="margin:0;color:#ffffff;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">New Enquiry</p>
                  <p style="margin:4px 0 0;color:#9ca3af;font-size:12px;">{$form_source}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 24px;color:#172554;font-size:16px;font-weight:700;">You have a new enquiry from your website.</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">
                  <strong style="color:#172554;text-transform:uppercase;font-size:12px;letter-spacing:0.05em;">Name</strong><br>
                  <span style="color:#374151;font-size:15px;">{$name}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">
                  <strong style="color:#172554;text-transform:uppercase;font-size:12px;letter-spacing:0.05em;">Company</strong><br>
                  <span style="color:#374151;font-size:15px;">{$company}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">
                  <strong style="color:#172554;text-transform:uppercase;font-size:12px;letter-spacing:0.05em;">Email</strong><br>
                  <a href="mailto:{$email}" style="color:#f97316;font-size:15px;">{$email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">
                  <strong style="color:#172554;text-transform:uppercase;font-size:12px;letter-spacing:0.05em;">Phone</strong><br>
                  <a href="tel:{$phone}" style="color:#f97316;font-size:15px;">{$phone}</a>
                </td>
              </tr>
              {$interests_html}
              {$message_html}
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 32px;">
            <a href="mailto:{$email}" style="display:inline-block;background:#f97316;color:#172554;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;font-size:14px;padding:12px 24px;text-decoration:none;">Reply to {$name} &rarr;</a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">Submitted {$date} &bull; 1:90 Align Website &bull; <a href="https://190align.com" style="color:#9ca3af;">190align.com</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;
}
