export const createOtpEmailTemplate = (randomOtp: string) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OTP Verification</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f8fafc;
                line-height: 1.6;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                padding: 40px 30px;
                text-align: center;
            }
            .header h1 {
                color: #ffffff;
                margin: 0;
                font-size: 28px;
                font-weight: 600;
            }
            .content {
                padding: 40px 30px;
                text-align: center;
            }
            .greeting {
                font-size: 18px;
                color: #374151;
                margin-bottom: 30px;
            }
            .otp-container {
                background-color: #eff6ff;
                border: 2px dashed #3b82f6;
                border-radius: 12px;
                padding: 30px;
                margin: 30px 0;
            }
            .otp-label {
                font-size: 16px;
                color: #1f2937;
                margin-bottom: 15px;
                font-weight: 500;
            }
            .otp-code {
                font-size: 36px;
                font-weight: 700;
                color: #1d4ed8;
                letter-spacing: 8px;
                margin: 0;
                font-family: 'Courier New', monospace;
            }
            .expiry-notice {
                background-color: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 15px 20px;
                margin: 30px 0;
                border-radius: 0 8px 8px 0;
            }
            .expiry-text {
                color: #92400e;
                font-size: 14px;
                margin: 0;
                font-weight: 500;
            }
            .instructions {
                color: #6b7280;
                font-size: 16px;
                margin: 30px 0;
                line-height: 1.7;
            }
            .footer {
                background-color: #f9fafb;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
            }
            .footer-text {
                color: #9ca3af;
                font-size: 14px;
                margin: 0;
            }
            .security-icon {
                width: 60px;
                height: 60px;
                background-color: #dbeafe;
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 20px;
            }
            @media (max-width: 600px) {
                .container {
                    margin: 10px;
                    border-radius: 8px;
                }
                .header, .content, .footer {
                    padding: 25px 20px;
                }
                .otp-code {
                    font-size: 28px;
                    letter-spacing: 4px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Verification Required</h1>
            </div>
            
            <div class="content">
                <div class="security-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1Z" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M9 12L11 14L15 10" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                
                <p class="greeting">
                    We've received a request to verify your account. Please use the verification code below to complete the process.
                </p>
                
                <div class="otp-container">
                    <p class="otp-label">Your Verification Code</p>
                    <p class="otp-code">${randomOtp}</p>
                </div>
                
                <div class="expiry-notice">
                    <p class="expiry-text">
                        ⏰ This code will expire in 5 minutes for your security
                    </p>
                </div>
                
                <p class="instructions">
                    Enter this code in the verification form to activate your account. If you didn't request this code, please ignore this email or contact our support team.
                </p>
            </div>
            
            <div class="footer">
                <p class="footer-text">
                    This is an automated message. Please do not reply to this email.
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
};
