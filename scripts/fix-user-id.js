import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixUserIds() {
  try {
    console.log('Checking for users with UUID IDs...');
    
    // Find users with UUID format IDs (contains hyphens)
    const usersWithUUIDs = await prisma.user.findMany({
      where: {
        id: {
          contains: '-'
        }
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });
    
    console.log(`Found ${usersWithUUIDs.length} users with UUID IDs:`);
    usersWithUUIDs.forEach(user => {
      console.log(`- ${user.email} (${user.name}): ${user.id}`);
    });
    
    if (usersWithUUIDs.length > 0) {
      console.log('\nThese users need to be recreated with ObjectId IDs.');
      console.log('You will need to:');
      console.log('1. Delete these users from the database');
      console.log('2. Sign out and sign back in to recreate them with ObjectId IDs');
      console.log('\nTo delete them, run:');
      usersWithUUIDs.forEach(user => {
        console.log(`DELETE FROM "User" WHERE id = '${user.id}';`);
      });
    } else {
      console.log('No users with UUID IDs found. All user IDs are properly formatted ObjectIds.');
    }
    
  } catch (error) {
    console.error('Error checking user IDs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserIds();
