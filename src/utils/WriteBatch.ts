import { firestore } from 'firebase-admin';
import {
  DocumentReference,
  DocumentData,
  SetOptions,
  UpdateData,
  Precondition,
  FieldPath,
  WriteResult,
} from '@google-cloud/firestore';
import * as sizeof from 'object-sizeof';

const BYTES_LIMIT = 10485760;
export class WriteBatch {
  // 10MiB is 10485760 bytes which is the limit for one write batch
  private consumedBytes = Infinity;
  // we specify properties are private when they are only used for the implementation of a class
  // Infinity is a numeric value representing infinity.
  private writeCount = Infinity;
  // we make a property read only so it cannot be modified
  private readonly batches: firestore.WriteBatch[] = [];
  // the get syntax binds an object property to a function that will be called when that property is looked up
  // this implies that when this.batch will call the batch method
  // this method ensures that whenever more then 500  writes have been passed to the currently used batch, a new batch is called to process the next 500 writes and so on
  private get batch(): firestore.WriteBatch {
    if (this.consumedBytes >= BYTES_LIMIT || this.writeCount >= 500) {
      if (
        this.consumedBytes >= BYTES_LIMIT &&
        this.consumedBytes !== Infinity
      ) {
        console.log('batch has been added due to size');
      } else if (this.writeCount >= 500 && this.writeCount !== Infinity) {
        console.log('batch has been added due to number of writes');
      }
      this.consumedBytes = 0;
      this.writeCount = 0;
      this.batches.push(firestore().batch());
    }
    this.writeCount++;
    return this.batches[this.batches.length - 1];
  }

  /* UNCOMMENT IF YOU NEED THE CREATE OR SET FUNCTIONALITY */

  // // when calling the create method on a WriteBatch Instance it calls the create method on the current batch
  // // we do return the instance of the WriteBatch in order to allow the chaining of calls, example: batch.set(....).update(..)
  // create(documentRef: DocumentReference, data: DocumentData): this {
  //   this.batch.create(documentRef, data);
  //   this.consumedBytes += require('object-sizeof')(data);
  //   return this;
  // }

  // set(
  //   documentRef: DocumentReference,
  //   data: DocumentData,
  //   options?: SetOptions
  // ): this {
  //   this.batch.set(documentRef, data, options);
  //   this.consumedBytes += require('object-sizeof')(data);
  //   return this;
  // }

  update(
    documentRef: DocumentReference,
    dataOrField: UpdateData | string | FieldPath,
    ...preconditionOrValues: any[]
  ): this {
    this.batch.update(documentRef, dataOrField as any, ...preconditionOrValues);
    this.consumedBytes +=
      require('object-sizeof')(dataOrField) +
      require('object-sizeof')(preconditionOrValues);
    return this;
  }

  delete(documentRef: DocumentReference, precondition?: Precondition): this {
    this.batch.delete(documentRef, precondition);
    return this;
  }

  commit = async () =>
    ([] as WriteResult[]).concat(
      ...(await Promise.all(this.batches.map(b => b.commit())))
    );
}
