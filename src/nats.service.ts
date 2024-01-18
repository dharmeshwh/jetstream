import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  connect,
  JetStreamClient,
  JetStreamManager,
  NatsConnection,
  PublishOptions,
  StringCodec,
} from 'nats';

@Injectable()
export class NatsService implements OnModuleInit, OnModuleDestroy {
  private client: NatsConnection;
  private jsManager: JetStreamManager;
  private js: JetStreamClient;
  private sc = StringCodec();

  // Lifecycle hook called when the module is initialized
  async onModuleInit() {
    // Connect to the NATS server
    this.client = await connect({
      servers: ['nats://localhost:4222'],
    });

    // Create JetStream Manager for managing streams and consumers
    this.jsManager = await this.client.jetstreamManager();

    // Create JetStream client for publishing and consuming messages
    this.js = this.client.jetstream();

    // Subscribe to a NATS subject for general message consumption
    this.subscribe();

    // Create a JetStream stream on module initialization
    await this.createStream();

    // Consume messages from the created JetStream stream
    await this.consumeStream();

    this.requestSubscriber();
  }

  // Lifecycle hook called when the module is destroyed
  onModuleDestroy() {
    // Close the NATS connection when the module is destroyed
    if (this.client) {
      this.client.close();
    }
  }

  // Create a JetStream stream with a specific configuration
  async createStream(): Promise<void> {
    const streamConfig = {
      name: 'mystream1',
      subjects: ['mystream1.*'],
      max_msgs: -1, // Unlimited messages
    };

    // Add the stream configuration using the JetStream Manager
    await this.jsManager.streams.add(streamConfig);
  }

  // Publish a message to the JetStream stream
  async publishStream(subject: string, data: any) {
    // Convert data to JSON and publish to the JetStream stream
    const payload = JSON.stringify(data);
    await this.js.publish(subject, Uint8Array.from(Buffer.from(payload)));
  }

  // Consume messages from the JetStream stream using a callback
  async consumeStream() {
    // Get the consumer for the JetStream stream
    const consumer = await this.js.consumers.get('mystream1');

    // Consume messages with a callback function
    await consumer.consume({
      callback: (m) => {
        console.log(`sequence: ${m.seq} data - ${m.data}`);

        // Acknowledge the received message
        m.ack();
      },
    });
  }

  // Publish a message to a regular NATS subject
  publish(subject: string, data: any, options?: PublishOptions): void {
    // Convert data to JSON and publish to the regular NATS subject
    const payload = JSON.stringify(data);
    this.client.publish(
      subject,
      Uint8Array.from(Buffer.from(payload)),
      options,
    );
  }

  // Subscribe to a regular NATS subject for general message consumption
  subscribe() {
    this.client.subscribe('mystream', {
      callback: (err, msg) => {
        console.log('Received data:', msg.data);
        console.log(`err: ${err}`);
      },
    });
  }

  /**
   * Subscribe to a NATS subject for handling requests and providing responses.
   * The subject should match the pattern 'greet.*', and the callback function
   * will be executed when a request is received. It responds with a message
   * containing the substring of the received subject (excluding 'greet.').
   */
  requestSubscriber() {
    this.client.subscribe('greet.*', {
      callback: (err, msg) => {
        if (err) {
          console.log('Subscription error', err.message);
          return;
        }

        // Extract the substring of the received subject (excluding 'greet.')
        const payload = JSON.stringify(msg.subject.substring(6));

        // Respond to the request with the extracted payload
        msg.respond(Uint8Array.from(Buffer.from(payload)));
      },
    });
  }

  /**
   * Send a request to a specific NATS subject ('greet.joe') and wait for a response.
   * It uses the request-response pattern, and the response is decoded using a custom codec.
   * @returns The decoded response data.
   */
  async requestResponse() {
    // Send a request to 'greet.joe' and await the response
    const response = await this.client.request('greet.joe');

    // Decode the response data using a custom codec (replace SomeCodec with your actual codec)
    return this.sc.decode(response.data);
  }
}
