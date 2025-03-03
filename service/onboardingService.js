import { messageHandler } from '../utils/index.js';
import { BAD_REQUEST, SUCCESS } from '../constants/statusCode.js';
import { Member } from '../schema/memberSchema.js';

// Add this helper function to check onboarding completion
const checkOnboardingCompletion = (member) => {
    const requiredFields = [
        'phone',
        'gender',
        'dob',
        'homeAddress',
        'homeCity',
        'homeState',
        'homeCountry',
        'nationality',
        'idType',
        'idNumber',
        'idScanFront'
    ];

    return requiredFields.every(field => 
        member[field] !== null && 
        member[field] !== undefined && 
        member[field] !== ''
    );
};

// Update the updateMemberProfileService
export const updateMemberProfileService = async (memberId, data, callback) => {
    try {
        // Find member
        const member = await Member.findByPk(memberId);
        if (!member) {
            return callback(
                messageHandler("Member not found", false, BAD_REQUEST)
            );
        }

        // Convert boolean 'true'/'false' to 'yes'/'no' for schengenVisaHolder
        if (data.schengenVisaHolder !== undefined) {
            // Convert the value to proper enum value
            data.schengenVisaHolder = data.schengenVisaHolder === true || 
                                    data.schengenVisaHolder === 'true' ? 'yes' : 'no';
        }

        // Clean and validate the data
        const cleanData = {
            othernames: data.othernames,
            phone: data.phone,
            gender: data.gender,
            dob: data.dob,
            homeAddress: data.homeAddress,
            homeCity: data.homeCity,
            homeZipCode: data.homeZipCode,
            homeState: data.homeState,
            homeCountry: data.homeCountry,
            idType: data.idType,
            idNumber: data.idNumber,
            nationality: data.nationality,
            schengenVisaHolder: data.schengenVisaHolder,
            // Handle file paths
            photo: data.photo || member.photo,
            idScanFront: data.idScanFront || member.idScanFront,
            idScanBack: data.idScanBack || member.idScanBack
        };

        // Remove undefined values
        Object.keys(cleanData).forEach(key => 
            cleanData[key] === undefined && delete cleanData[key]
        );

        // Update member with cleaned data
        await member.update(cleanData);

        // Refresh member data
        const updatedMember = await Member.findByPk(memberId);

        // Check if all required fields are completed
        const isOnboardingComplete = checkOnboardingCompletion(updatedMember);

        // Update member status if onboarding is complete
        if (isOnboardingComplete && updatedMember.memberStatus === 'PENDING') {
            await updatedMember.update({ memberStatus: 'ACTIVE' });
        }

        // Prepare response data
        const profileData = {
            memberId: updatedMember.memberId,
            firstname: updatedMember.firstname,
            lastname: updatedMember.lastname,
            othernames: updatedMember.othernames,
            email: updatedMember.email,
            phone: updatedMember.phone,
            gender: updatedMember.gender,
            dob: updatedMember.dob,
            homeAddress: updatedMember.homeAddress,
            homeCity: updatedMember.homeCity,
            homeZipCode: updatedMember.homeZipCode,
            homeState: updatedMember.homeState,
            homeCountry: updatedMember.homeCountry,
            idType: updatedMember.idType,
            idNumber: updatedMember.idNumber,
            idScanFront: updatedMember.idScanFront,
            idScanBack: updatedMember.idScanBack,
            nationality: updatedMember.nationality,
            schengenVisaHolder: updatedMember.schengenVisaHolder,
            photo: updatedMember.photo,
            memberStatus: updatedMember.memberStatus,
            onboardingComplete: isOnboardingComplete
        };

        return callback(
            messageHandler(
                isOnboardingComplete ? 
                    "Profile updated successfully. Onboarding complete!" : 
                    "Profile updated successfully",
                true,
                SUCCESS,
                profileData
            )
        );

    } catch (error) {
        console.error('Profile update error:', error);
        return callback(
            messageHandler("An error occurred while updating profile", false, BAD_REQUEST)
        );
    }
};

// Service to get onboarding status
export const getOnboardingStatusService = async (memberId, callback) => {
    try {
        const member = await Member.findByPk(memberId);
        if (!member) {
            return callback(
                messageHandler("Member not found", false, BAD_REQUEST)
            );
        }

        // Calculate completion percentage
        const requiredFields = [
            'phone',
            'gender',
            'dob',
            'homeAddress',
            'homeCity',
            'homeState',
            'homeCountry',
            'nationality',
            'idType',
            'idNumber',
            'idScanFront'
        ];

        const completedFields = requiredFields.filter(field => member[field] !== null && member[field] !== undefined);
        const completionPercentage = Math.round((completedFields.length / requiredFields.length) * 100);

        const onboardingStatus = {
            isComplete: member.memberStatus === 'ACTIVE',
            completionPercentage,
            completedFields,
            pendingFields: requiredFields.filter(field => !member[field]),
            currentStatus: member.memberStatus
        };

        return callback(
            messageHandler("Onboarding status retrieved", true, SUCCESS, onboardingStatus)
        );

    } catch (error) {
        console.error('Get onboarding status error:', error);
        return callback(
            messageHandler("An error occurred while fetching onboarding status", false, BAD_REQUEST)
        );
    }
};

// Service to validate ID documents
export const validateIdDocumentsService = async (memberId, callback) => {
    try {
        const member = await Member.findByPk(memberId);
        if (!member) {
            return callback(
                messageHandler("Member not found", false, BAD_REQUEST)
            );
        }

        // Check if required ID documents are uploaded
        if (!member.idType || !member.idNumber || !member.idScanFront) {
            return callback(
                messageHandler("Required ID documents are missing", false, BAD_REQUEST, {
                    missingDocuments: {
                        idType: !member.idType,
                        idNumber: !member.idNumber,
                        idScanFront: !member.idScanFront
                    }
                })
            );
        }

        // Here you could add additional validation logic
        // For example, checking document expiry, verification status, etc.

        return callback(
            messageHandler("ID documents are valid", true, SUCCESS, {
                idType: member.idType,
                idNumber: member.idNumber,
                idScanFront: member.idScanFront,
                idScanBack: member.idScanBack
            })
        );

    } catch (error) {
        console.error('ID validation error:', error);
        return callback(
            messageHandler("An error occurred while validating ID documents", false, BAD_REQUEST)
        );
    }
};

// Update the updateOnboardingSectionService to also check completion
export const updateOnboardingSectionService = async (memberId, section, data, callback) => {
    try {
        const member = await Member.findByPk(memberId);
        if (!member) {
            return callback(
                messageHandler("Member not found", false, BAD_REQUEST)
            );
        }

        let updateData = {};
        
        switch(section) {
            case 'personal':
                updateData = {
                    othernames: data.othernames,
                    phone: data.phone,
                    gender: data.gender,
                    dob: data.dob,
                    nationality: data.nationality
                };
                break;
                
            case 'address':
                updateData = {
                    homeAddress: data.homeAddress,
                    homeCity: data.homeCity,
                    homeZipCode: data.homeZipCode,
                    homeState: data.homeState,
                    homeCountry: data.homeCountry
                };
                break;
                
            case 'identification':
                updateData = {
                    idType: data.idType,
                    idNumber: data.idNumber,
                    idScanFront: data.idScanFront,
                    idScanBack: data.idScanBack
                };
                break;
                
            case 'visa':
                updateData = {
                    schengenVisaHolder: data.schengenVisaHolder
                };
                break;
                
            default:
                return callback(
                    messageHandler("Invalid section specified", false, BAD_REQUEST)
                );
        }

        await member.update(updateData);

        // Check if all required fields are now complete
        const updatedMember = await Member.findByPk(memberId);
        const isOnboardingComplete = checkOnboardingCompletion(updatedMember);

        // Update member status if onboarding is complete
        if (isOnboardingComplete && updatedMember.memberStatus === 'PENDING') {
            await updatedMember.update({ memberStatus: 'ACTIVE' });
        }

        return callback(
            messageHandler(
                isOnboardingComplete ? 
                    `${section} information updated. Onboarding complete!` : 
                    `${section} information updated successfully`,
                true,
                SUCCESS,
                {
                    ...updateData,
                    memberStatus: updatedMember.memberStatus,
                    onboardingComplete: isOnboardingComplete
                }
            )
        );

    } catch (error) {
        console.error('Section update error:', error);
        return callback(
            messageHandler(`An error occurred while updating ${section} information`, false, BAD_REQUEST)
        );
    }
};

// Service to get member profile
export const getMemberProfileService = async (memberId, callback) => {
    try {
        const member = await Member.findByPk(memberId);
        if (!member) {
            return callback(
                messageHandler("Member not found", false, BAD_REQUEST)
            );
        }

        // Prepare response data (excluding sensitive information)
        const profileData = {
            memberId: member.memberId,
            firstname: member.firstname,
            lastname: member.lastname,
            othernames: member.othernames,
            email: member.email,
            phone: member.phone,
            gender: member.gender,
            dob: member.dob,
            homeAddress: member.homeAddress,
            homeCity: member.homeCity,
            homeZipCode: member.homeZipCode,
            homeState: member.homeState,
            homeCountry: member.homeCountry,
            idType: member.idType,
            idNumber: member.idNumber,
            idScanFront: member.idScanFront,
            idScanBack: member.idScanBack,
            nationality: member.nationality,
            schengenVisaHolder: member.schengenVisaHolder,
            photo: member.photo,
            memberStatus: member.memberStatus,
            regDate: member.regDate
        };

        return callback(
            messageHandler("Profile retrieved successfully", true, SUCCESS, profileData)
        );

    } catch (error) {
        console.error('Get profile error:', error);
        return callback(
            messageHandler("An error occurred while fetching profile", false, BAD_REQUEST)
        );
    }
};

// Service to update specific profile fields
export const updateProfileFieldsService = async (memberId, updates, callback) => {
    try {
        const member = await Member.findByPk(memberId);
        if (!member) {
            return callback(
                messageHandler("Member not found", false, BAD_REQUEST)
            );
        }

        // Filter out undefined values
        const validUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, value]) => value !== undefined)
        );

        // Check if there are any valid updates
        if (Object.keys(validUpdates).length === 0) {
            return callback(
                messageHandler("No valid updates provided", false, BAD_REQUEST)
            );
        }

        // Update only the provided fields
        await member.update(validUpdates);

        // Get updated member data
        const updatedMember = await Member.findByPk(memberId);

        // Prepare response data
        const profileData = {
            memberId: updatedMember.memberId,
            firstname: updatedMember.firstname,
            lastname: updatedMember.lastname,
            othernames: updatedMember.othernames,
            email: updatedMember.email,
            phone: updatedMember.phone,
            gender: updatedMember.gender,
            dob: updatedMember.dob,
            homeAddress: updatedMember.homeAddress,
            homeCity: updatedMember.homeCity,
            homeZipCode: updatedMember.homeZipCode,
            homeState: updatedMember.homeState,
            homeCountry: updatedMember.homeCountry,
            idType: updatedMember.idType,
            idNumber: updatedMember.idNumber,
            idScanFront: updatedMember.idScanFront,
            idScanBack: updatedMember.idScanBack,
            nationality: updatedMember.nationality,
            schengenVisaHolder: updatedMember.schengenVisaHolder,
            photo: updatedMember.photo,
            memberStatus: updatedMember.memberStatus
        };

        return callback(
            messageHandler("Profile updated successfully", true, SUCCESS, {
                updatedFields: Object.keys(validUpdates),
                profile: profileData
            })
        );

    } catch (error) {
        console.error('Update profile fields error:', error);
        return callback(
            messageHandler("An error occurred while updating profile fields", false, BAD_REQUEST)
        );
    }
};

// Service to upload documents
export const uploadDocumentsService = async (memberId, files, callback) => {
    console.log(files)
    try {
        const member = await Member.findByPk(memberId);
        if (!member) {
            return callback(
                messageHandler("Member not found", false, BAD_REQUEST)
            );
        }

        const updates = {};
        
        // Handle photo upload
        if (files.photo) {
            updates.photo = files.photo[0].path;
        }
        
        // Handle ID scans
        if (files.idScanFront) {
            updates.idScanFront = files.idScanFront[0].path;
        }
        
        if (files.idScanBack) {
            updates.idScanBack = files.idScanBack[0].path;
        }

        // Update member record
        await member.update(updates);

        return callback(
            messageHandler("Documents uploaded successfully", true, SUCCESS, {
                uploadedFiles: updates
            })
        );

    } catch (error) {
        console.error('Document upload error:', error);
        return callback(
            messageHandler("An error occurred while uploading documents", false, BAD_REQUEST)
        );
    }
}; 