import axios from 'axios';
import { expect } from 'chai';

const BASE_URL = 'http://localhost:8000/api/v1';
const JWT_TOKEN = 'YOUR_JWT_TOKEN'; // Replace with actual token

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

describe('Message Routes Tests', () => {
  describe('GET /message/agent/conversations', () => {
    it('should return agent conversations', async () => {
      try {
        const response = await axiosInstance.get('/message/agent/conversations');
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property('success', true);
        expect(response.data).to.have.property('data').that.is.an('array');
      } catch (error) {
        console.error('Error testing agent conversations:', error.response?.data || error.message);
        throw error;
      }
    });
  });

  describe('GET /message/agent/messages/:partnerId', () => {
    it('should return conversation thread with valid partner', async () => {
      try {
        const partnerId = 123; // Replace with actual partner ID
        const response = await axiosInstance.get(`/message/agent/messages/${partnerId}?partnerType=member`);
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property('success', true);
        expect(response.data).to.have.property('data').that.is.an('array');
      } catch (error) {
        console.error('Error testing conversation thread:', error.response?.data || error.message);
        throw error;
      }
    });

    it('should return 400 with invalid partner type', async () => {
      try {
        const partnerId = 123;
        await axiosInstance.get(`/message/agent/messages/${partnerId}?partnerType=invalid`);
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.response.data).to.have.property('success', false);
      }
    });
  });

  describe('POST /message/messages', () => {
    it('should send a message successfully', async () => {
      try {
        const messageData = {
          receiverId: 123,
          receiverType: 'member',
          message: 'Test message'
        };

        const response = await axiosInstance.post('/message/messages', messageData);
        expect(response.status).to.equal(201);
        expect(response.data).to.have.property('success', true);
        expect(response.data).to.have.property('data');
      } catch (error) {
        console.error('Error testing send message:', error.response?.data || error.message);
        throw error;
      }
    });

    it('should return 400 with missing required fields', async () => {
      try {
        const messageData = {
          receiverId: 123
          // Missing receiverType and message
        };

        await axiosInstance.post('/message/messages', messageData);
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.response.data).to.have.property('success', false);
      }
    });
  });
}); 