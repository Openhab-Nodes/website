export default function refcode(user, start_date) {
    return `OHX-${user.email.replace("@", "/")}-${Math.floor(
        start_date.getFullYear() / 100
      )}${("" + start_date.getMonth()).padStart(2, "0")}`;
}