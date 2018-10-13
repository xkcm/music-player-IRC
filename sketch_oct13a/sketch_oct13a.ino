#include <IRremote.h>

int rec_pin = 2;

unsigned long int prev_value = 0x00000000;

IRrecv irrecv(rec_pin);
decode_results result;

void setup(){
  Serial.begin(9600);
  irrecv.enableIRIn();
}

void loop(){
  if(irrecv.decode(&result)){
    if(result.value!=0xFFFFFFFF){
      Serial.println(result.value, HEX);
      prev_value = result.value;
    }
    else Serial.println(prev_value, HEX);
    irrecv.resume();
  }
}


