const DOCUMENT_REQUIREMENTS = {
    undergraduate: {
        required: [
            'internationalPassport',
            'olevelResult',
            'olevelPin',
            'academicReferenceLetter',
            'resume',
            'languageTestCert'
        ]
    },
    postgraduate: {
        required: [
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
    }
};

export const validateDocuments = (files, programType) => {
    const requirements = DOCUMENT_REQUIREMENTS[programType.toLowerCase()];
    if (!requirements) {
        throw new Error('Invalid program type');
    }

    const missingDocs = requirements.required.filter(doc => !files[doc]);
    
    return {
        isValid: missingDocs.length === 0,
        missingDocs
    };
}; 