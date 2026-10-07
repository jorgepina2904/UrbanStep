export const generateSKU = (category, brand) => {
    const catCode = category ? category.substring(0, 3).toUpperCase() : 'GEN';
    const brandCode = brand ? brand.substring(0, 3).toUpperCase() : 'BRN';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `US-${catCode}-${brandCode}-${randomNum}`;
};