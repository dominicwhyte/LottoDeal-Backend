<?php

/* modified from http://stackoverflow.com/questions/32814031/make-a-submit-button-send-email-with-details-in-html */


$field_name = $_POST['fname']." ". $_POST['lname'];
$field_email = $_POST['email'];
$field_message = $_POST['message'];

$mail_to = 'lirvine@gmail.com';
$subject = 'Message from a site visitor '.$field_name;

$body_message = 'From: '.$field_name."\n";
$body_message .= 'E-mail: '.$field_email."\n";
$body_message .= 'Message: '.$field_message;

$headers = 'From: '.$field_email."\r\n";
$headers .= 'Reply-To: '.$field_email."\r\n";

$mail_status = mail($mail_to, $subject, $body_message, $headers);

if ($mail_status) { ?>php
    <script language="javascript" type="text/javascript">
        alert('Thank you for the feedback.');
        window.location = 'contact.html';
    </script>
<?php
}
else { ?>php
    <script language="javascript" type="text/javascript">
        alert('Something went wrong. Please try again or contact at lirvine@gmail.com');
        window.location = 'contact.html';
    </script>
<?php
}

?>
