// Direct fix for user subscription status
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixUserSubscription() {
  try {
    // Update user subscription status
    const user = await prisma.user.update({
      where: { 
        email: 'vehenoj199@roratu.com' 
      },
      data: { 
        isSubscribed: true 
      }
    });
    
    console.log('✅ User subscription status updated:', user.email, user.isSubscribed);
    
    // Verify the subscription exists
    const subscription = await prisma.purchase_subscription.findFirst({
      where: { 
        userId: user.id,
        status: 'ACTIVE'
      }
    });
    
    console.log('✅ Active subscription found:', subscription ? 'YES' : 'NO');
    if (subscription) {
      console.log('Subscription details:', {
        id: subscription.id,
        status: subscription.status,
        endDate: subscription.endDate
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserSubscription();
