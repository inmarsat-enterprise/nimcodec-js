// types.d.ts

declare namespace CBC {
  export type CbcCodec = import('./codecs/cbc/types').CbcCodec;
  export type FieldCodec = import('./codecs/cbc/types').FieldCodec;
  export type FieldType = import('./codecs/cbc/types').FieldType;
  export type MessageCodec = import('./codecs/cbc/types').MessageCodec;
  export type MessageDecoded = import('./codecs/cbc/types').MessageDecoded;
  export type MessageDirection = import('./codecs/cbc/types').MessageDirection;
}

declare namespace NIMO {
  export type FieldType = import('./codecs/nimo/types').FieldType;
  export type FieldCodec = import('./codecs/nimo/types').FieldCodec;
  export type FieldDecoded = import('./codecs/nimo/types').FieldDecoded;
  export type MessageCodec = import('./codecs/nimo/types').MessageCodec;
  export type MessageDecoded = import('./codecs/nimo/types').MessageDecoded;
  export type NimoCodec = import('./codecs/nimo/types').NimoCodec;
  export type ServiceCodec = import('./codecs/nimo/types').ServiceCodec;
}

// Export everything from the package
declare module 'nimcodec' {
  // These allow users to access types via nimcodec.cbc.FieldCodec
  export const cbc: {
    
    /** Parent codec containing MessageCodec(s) */
    CbcCodec: CBC.CbcCodec;
    /** Field codec child of MessageCodec */
    FieldCodec: CBC.FieldCodec;
    /** Enumerated type values for field.type */
    FieldType: CBC.FieldType;
    /** Message codec containing FieldCodec(s) */
    MessageCodec: CBC.MessageCodec;
    /** JSON structure of a decoded message with its transported values */
    MessageDecoded: CBC.MessageDecoded;
    /** Enumerated type values for message.direction */
    MessageDirection: CBC.MessageDirection;
    
    /**
     * Decode a CBC-encoded message buffer
     * @param buffer The binary-encoded message used for network transport
     * @param codec The codec used to decode the buffer
     * @param isMo Set if the message is Mobile-Originated (default true)
     * @param coapMessageId Set if a CoAP message ID was parsed (default undefined)
     * @returns JSON-structured message with field values
     */
    decodeMessage: (
      buffer: Buffer,
      codec: CBC.CbcCodec | CBC.MessageCodec, 
      isMo?: boolean, 
      coapMessageId?: number,
    ) => CBC.MessageDecoded;

    /**
     * Encodes a JSON message/values to a binary Buffer for transport.
     * If using CoAP transport, the returned buffer is only the payload.
     * @param message The JSON message to encode
     * @param codec The codec to use for encoding
     * @param isMo Set if Mobile-Originated (default false)
     * @param isCoap Set if using CoAP transport (default false)
     * @returns A buffer of payload bytes, not including any CoAP overhead
     */
    encodeMessage: (
      message: CBC.MessageDecoded,
      codec: CBC.CbcCodec | CBC.MessageCodec,
      isMo?: boolean,
      isCoap?: boolean,
    ) => Buffer;

  };

  export const nimo: {
    
    /** Parent codec containing MessageCodec(s) */
    NimoCodec: NIMO.NimoCodec;
    /** Field codec child of MessageCodec */
    FieldCodec: NIMO.FieldCodec;
    /** JSON structure of a decoded field with a MessageDecoded */
    FieldDecoded: NIMO.FieldDecoded;
    /** Enumerated type values for field.type */
    FieldType: NIMO.FieldType;
    /** Message codec containing FieldCodec(s) */
    MessageCodec: NIMO.MessageCodec;
    /** JSON structure of a decoded message with its transported values */
    MessageDecoded: NIMO.MessageDecoded;
    
    /**
     * Decode a NIMO-encoded message buffer
     * @param buffer The binary-encoded message used for network transport
     * @param codec The codec used to decode the buffer
     * @param isMo Set if the message is Mobile-Originated (default true)
     * @returns JSON-structured message with field values
     */
    decodeMessage: (
      payloadRaw: number[] | Buffer,
      codec: NIMO.NimoCodec | NIMO.MessageCodec, 
      isMo?: boolean, 
    ) => NIMO.MessageDecoded;

    /**
     * Encodes a JSON message/values to a binary Buffer for transport.
     * If using CoAP transport, the returned buffer is only the payload.
     * @param message The JSON message to encode
     * @param codec The codec to use for encoding
     * @param isMo Set if Mobile-Originated (default false)
     * @param isCoap Set if using CoAP transport (default false)
     * @returns A buffer of payload bytes, not including any CoAP overhead
     */
    encodeMessage: (
      message: NIMO.MessageDecoded,
      codec: NIMO.NimoCodec | NIMO.MessageCodec,
      isMo?: boolean,
      isCoap?: boolean,
    ) => Buffer;

  };

  // Re-exporting the namespaces for direct type casting
  export { CBC as cbcTypes, NIMO as nimoTypes };
}
