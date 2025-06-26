import ApplicationDocument from '../schema/applicationDocumentSchema.js';
import { Member } from '../schema/memberSchema.js';
import { messageHandler } from '../utils/index.js';
import { SUCCESS, BAD_REQUEST, NOT_FOUND } from '../constants/statusCode.js';
import Application from '../schema/ApplicationSchema.js';
import { Op } from 'sequelize';
import {Program} from '../schema/programSchema.js';
import { getConfig } from './appConfigService.js';

// Check active applications count
const checkActiveApplicationsCount = async (memberId) => {
    const activeCount = await Application.count({
        where: {
            memberId,
            applicationStatus: {
                [Op.notIn]: ['Rejected', 'Withdrawn', 'Completed']
            }
        }
    });
    return activeCount < 3;
};

// Verify member profile completion
export const verifyMemberProfile = async (memberId) => {
    const member = await Member.findByPk(memberId);
    
    const requiredFields = [
         'phone', 'dob', 'idNumber', 'idType',
        'nationality', 'homeAddress', 'homeCity', 'homeZipCode',
        'homeState', 'homeCountry', 'gender'
    ];

    return requiredFields.every(field => member[field] !== null && member[field] !== undefined);
};

// Document requirements by program type
export const REQUIRED_DOCUMENTS = {
    undergraduate: [
        'internationalPassport',
        'olevelResult',
        'olevelPin',
        'academicReferenceLetter',
        'resume',
        'languageTestCert'
    ],
    postgraduate: [
        'internationalPassport',
        'olevelResult',
        'academicReferenceLetter',
        'resume',
        'universityDegreeCertificate',
        'universityTranscript',
        'sop',
        'researchDocs',
        'languageTestCert'
    ]
};

// Helper function to check required documents
export const checkRequiredDocuments = async (memberId, programCategory) => {
    try {
        // Get all documents for the member
        const documents = await ApplicationDocument.findAll({
            where: { memberId },
            attributes: ['documentType']
        });

        // Get array of document types the member has
        const uploadedDocTypes = documents.map(doc => doc.documentType);

        // Define required documents based on program category
        const requiredDocs = {
            undergraduate: [
                'internationalPassport',
                'olevelResult',
                'olevelPin',
                'academicReferenceLetter',
                'resume',
                'languageTestCert'
            ],
            postgraduate: [
                'internationalPassport',
                'olevelResult',
                'academicReferenceLetter',
                'resume',
                'universityDegreeCertificate',
                'universityTranscript',
                'sop',
                'researchDocs',
                'languageTestCert'
            ]
        };

        // Get required documents for the program category
        const docsRequired = requiredDocs[programCategory.toLowerCase()];
        if (!docsRequired) {
            throw new Error('Invalid program category');
        }

        // Check which required documents are missing
        const missingDocs = docsRequired.filter(
            docType => !uploadedDocTypes.includes(docType)
        );

        return {
            isComplete: missingDocs.length === 0,
            missingDocs
        };

    } catch (error) {
        console.error('Check required documents error:', error);
        throw error;
    }
};

export const initiateApplicationService = async (memberId, programData, callback, requireDocumentValidation = true) => {
    try {
         // Check active applications limit
        // const canApply = await checkActiveApplicationsCount(memberId);
        // if (!canApply) {
        //     return callback(messageHandler(
        //         "Maximum active applications (3) reached", 
        //         false, 
        //         BAD_REQUEST
        //     ));
        // }
        // Verify profile completion
        const isProfileComplete = await verifyMemberProfile(memberId);
        if (!isProfileComplete) {
            return callback(messageHandler(
                "Please complete your profile before applying", 
                false, 
                BAD_REQUEST
            ));
        }

        // Check if document validation is required from config
        const requireDocValidation = await getConfig('require_document_validation');
        
        if (requireDocValidation.data.require_document_validation) {
            const { isComplete, missingDocs } = await checkRequiredDocuments(memberId, programData.programCategory);
            if (!isComplete) {
                const documentDescriptions = {
                    'International Passport': 'International Passport (must be valid for at least 6 months)',
                    'Olevel Result': 'O-Level Result (WAEC, NECO, or equivalent)',
                    'Olevel Pin': 'O-Level Result Checker PIN/Scratch Card',
                    'Academic Reference Letter': 'Academic Reference Letter from your previous institution',
                    'Resume': 'Updated CV/Resume (including your work experience and education)',
                    'Language Test Cert': 'English Language Proficiency Certificate (IELTS, TOEFL, or equivalent)',
                    'Birth Certificate': 'Birth Certificate or Age Declaration',
                    'Transcript': 'Official Academic Transcript from your previous institution',
                    'Degree Certificate': 'Bachelor\'s Degree Certificate or Statement of Result',
                    'Personal Statement': 'Personal Statement/Statement of Purpose',
                    'Recommendation Letter': 'Professional or Academic Recommendation Letter'
                };

                const formattedDocs = missingDocs.map(doc => documentDescriptions[doc] || doc);

                return callback(messageHandler(
                    {
                        message: "Required Documents Missing",
                        details: {
                            title: "Please upload the following documents to proceed:",
                            missingDocuments: formattedDocs,
                            note: "All documents should be clear, legible, and in PDF or JPG format. Maximum file size: 5MB per document.",
                            totalMissing: missingDocs.length,
                            helpText: "Need help? Contact our support team for guidance on document requirements."
                        }
                    },
                    false,
                    BAD_REQUEST
                ));
            }
        }

        // Create new application
        const application = await Application.create({
            memberId,
            programId: programData.programId,
            programCategory: programData.programCategory,
            applicationStage: 1,
            paymentStatus: 'Unpaid',
            applicationStatus: 'Pending',
            intake: programData.intake,
            applicationDate: new Date()
        });

        return callback(messageHandler(
            "Application initiated successfully", 
            true, 
            SUCCESS, 
            application
        ));

    } catch (error) {
        console.error('Application initiation error:', error);
        return callback(messageHandler(
            error.message || "Error initiating application", 
            false, 
            BAD_REQUEST
        ));
    }
};

export const getApplicationStatusService = async (memberId, applicationId, callback) => {
    try {
        const application = await Application.findOne({
            where: { 
                applicationId,
                memberId 
            },
            include: [
                {
                    model: ApplicationDocument,
                    as: 'applicationDocuments',
                    attributes: ['documentId', 'documentType', 'documentPath', 'uploadDate', 'status']
                },
                {
                    model: Member,
                    as: 'applicationMember',
                    attributes: [
                        'memberId', 'firstname', 'lastname', 'othernames', 
                        'email', 'phone', 'dob', 'gender', 'nationality',
                        'homeAddress', 'homeCity', 'homeState', 'homeCountry',
                        'homeZipCode', 'idType', 'idNumber'
                    ]
                },
                {
                    model: Program,
                    as: 'program',
                    attributes: [
                        'programId', 
                        'programName',
                        'degree',
                        'degreeLevel', 
                        'schoolName',
                        'language',
                        'semesters',
                        'fee',
                        'location',
                        'about',
                        'features',
                        'schoolLogo',
                        'applicationFee',
                    ]
                }
            ],
            attributes: [
                'applicationId', 
                'memberId', 
                'programId',
                'applicationStage',
                'paymentStatus',
                'applicationStatus',
                'intake',
                'applicationDate',
                'applicationStatusDate'
            ]
        });

        if (!application) {
            return callback(messageHandler(
                "Application not found", 
                false, 
                NOT_FOUND
            ));
        }

        return callback(messageHandler(
            "Application details retrieved", 
            true, 
            SUCCESS, 
            application
        ));

    } catch (error) {
        console.error('Get application status error:', error);
        return callback(messageHandler(
            "Error retrieving application details", 
            false, 
            BAD_REQUEST
        ));
    }
};

export const getAllApplicationsService = async (memberId, callback) => {
    try {
        const applications = await Application.findAll({
            where: { memberId },
            include: [
                {
                    model: ApplicationDocument,
                    as: 'applicationDocuments',
                    attributes: ['documentId', 'documentType', 'documentPath', 'uploadDate', 'status']
                },
                {
                    model: Member,
                    as: 'applicationMember',
                    attributes: [
                        'memberId', 'firstname', 'lastname', 'othernames', 
                        'email', 'phone', 'dob', 'gender', 'nationality',
                        'homeAddress', 'homeCity', 'homeState', 'homeCountry',
                        'homeZipCode', 'idType', 'idNumber'
                    ]
                },
                {
                    model: Program,
                    as: 'program',
                    attributes: [
                        'programId', 
                        'programName',
                        'degree',
                        'degreeLevel', 
                        'schoolName',
                        'language',
                        'semesters',
                        'fee',
                        'location',
                        'about',
                        'features',
                        'schoolLogo',
                        'applicationFee',
                        
                    ]
                }
            ],
            attributes: [
                'applicationId', 
                'memberId', 
                'programId',
                'applicationStage',
                'paymentStatus',
                'applicationStatus',
                'intake',
                'applicationDate',
                'applicationStatusDate'
            ],
            order: [['applicationDate', 'DESC']]  // Keep the DESC order
        });

        return callback(messageHandler(
            "Applications retrieved successfully",
            true,
            SUCCESS,
            applications
        ));

    } catch (error) {
        console.error('Get all applications error:', error);
        return callback(messageHandler(
            "Error retrieving applications",
            false,
            BAD_REQUEST
        ));
    }
};

export const checkEligibilityService = async (memberId, callback) => {
    try {
        // Get all documents for the member
        const documents = await ApplicationDocument.findAll({
            where: { memberId },
            attributes: ['documentType', 'documentPath', 'status']
        });

        // Convert documents array to an object for easier checking
        const uploadedDocs = documents.reduce((acc, doc) => {
            acc[doc.documentType] = doc.documentPath;
            return acc;
        }, {});

        // Check for both program types
        const eligibility = {
            undergraduate: {
                isEligible: false,
                missingDocuments: []
            },
            postgraduate: {
                isEligible: false,
                missingDocuments: []
            }
        };

        // Check undergraduate requirements
        eligibility.undergraduate.missingDocuments = REQUIRED_DOCUMENTS.undergraduate.filter(
            docType => !uploadedDocs[docType]
        );
        eligibility.undergraduate.isEligible = eligibility.undergraduate.missingDocuments.length === 0;

        // Check postgraduate requirements
        eligibility.postgraduate.missingDocuments = REQUIRED_DOCUMENTS.postgraduate.filter(
            docType => !uploadedDocs[docType]
        );
        eligibility.postgraduate.isEligible = eligibility.postgraduate.missingDocuments.length === 0;

        // Format document names for better readability
        const formatDocName = (docName) => {
            return docName
                .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
                .trim();
        };

        // Format the response
        const response = {
            undergraduate: {
                isEligible: eligibility.undergraduate.isEligible,
                missingDocuments: eligibility.undergraduate.missingDocuments.map(formatDocName),
                message: eligibility.undergraduate.isEligible 
                    ? "Eligible for undergraduate programs" 
                    : "Missing required documents for undergraduate programs"
            },
            postgraduate: {
                isEligible: eligibility.postgraduate.isEligible,
                missingDocuments: eligibility.postgraduate.missingDocuments.map(formatDocName),
                message: eligibility.postgraduate.isEligible 
                    ? "Eligible for postgraduate programs" 
                    : "Missing required documents for postgraduate programs"
            }
        };

        return callback(messageHandler(
            "Eligibility check completed",
            true,
            SUCCESS,
            response
        ));

    } catch (error) {
        console.error('Eligibility check error:', error);
        return callback(messageHandler(
            "Error checking eligibility",
            false,
            BAD_REQUEST
        ));
    }
}; 