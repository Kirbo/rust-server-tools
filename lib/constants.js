var millisecond     = 1;
var quarter_second  = 250   * millisecond;
var half_second     = 2     * quarter_second;
var second          = 2     * half_second;
var quarter_minute  = 15    * second;
var half_minute     = 2     * quarter_minute;
var minute          = 2     * half_minute;
var quarter_hour    = 15    * minute;
var half_hour       = 2     * quarter_hour;
var hour            = 2     * half_hour;


module.exports = {
    millisecond: millisecond,
    quarter_second: quarter_second,
    half_second: half_second,
    second: second,
    quarter_minute: quarter_minute,
    half_minute: half_minute,
    minute: minute,
    quarter_hour: quarter_hour,
    half_hour: half_hour,
    hour: hour
};