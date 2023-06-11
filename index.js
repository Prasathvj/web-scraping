const express = require('express');

const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const cors = require("cors")
const dotenv =require("dotenv")

//configure the environment
dotenv.config();
const PORT =process.env.PORT

//middleware
const app = express();
app.use(express.json())
app.use(cors());


//MongoDB Connection Setup
mongoose.connect('mongodb+srv://prasathvj18:prasath12@cluster1.yxzhz6w.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB Atlas');
});

// Define Product Schema
const productSchema = new mongoose.Schema({
  source: String,
  image: String,
  title: String,
  rating: String,
  price: String,
  discountPrice: String,
  offer: String,
  productlink:String,
});

const Product = mongoose.model('Product', productSchema);


// Scrape Flipkart
const scrapeFlipkart =async()=>{
  try {
      const url = 'https://www.flipkart.com/search?sid=tyy%2C4io&p%5B%5D=facets.network_type%255B%255D%3D5G&ctx=eyJjYXJkQ29udGV4dCI6eyJhdHRyaWJ1dGVzIjp7InRpdGxlIjp7Im11bHRpVmFsdWVkQXR0cmlidXRlIjp7ImtleSI6InRpdGxlIiwiaW5mZXJlbmNlVHlwZSI6IlRJVExFIiwidmFsdWVzIjpbIlNob3AgTm93Il0sInZhbHVlVHlwZSI6Ik1VTFRJX1ZBTFVFRCJ9fX19fQ%3D%3D&otracker=clp_metro_expandable_1_6.metroExpandable.METRO_EXPANDABLE_Shop%2BNow_mobile-phones-store_92P8Y0U07S00_wp2&fm=neo%2Fmerchandising&iid=M_b49cac28-2871-472e-8211-03e4a5d02b6e_6.92P8Y0U07S00&ppt=hp&ppn=homepage&ssid=sxpmvacw5c0000001686282140077&page=2'
      const responce = await axios.get(url)
      const $ = cheerio.load(responce.data)

      const products =[];

      $('._2kHMtA').each((idx,ele)=>{
          //const id = idx+1;
          const image =$(ele).find('img').attr('src');
          const title = $(ele).find('div._4rR01T').text().trim();
          const rating = $(ele).find('div._3LWZlK').text().trim();
          const price = $(ele).find('._30jeq3._1_WHN1').text().trim();
          const discountPrice = $(ele).find('._3I9_wc._27UcVY').text().trim();
          const offer = $(ele).find('._3Ay6Sb').text().trim();
          const urll = 'https://www.flipkart.com'
          const productlink =urll + $(ele).find('a').attr('href')
         
          products.push({source:'flipkart',image, title, rating, price, discountPrice, offer, productlink})
      })
      await Product.insertMany(products);

       console.log('Flipkart data scraped and saved to the database.');

  } catch (error) {
      console.log('internal error',error)
  }
}

// Scrape Amazon
const scrapeAmazon = async()=>{
  try {
      const url ='https://www.amazon.in/s?i=electronics&rh=n%3A65320318031&fs=true&page=2&qid=1686295107&ref=sr_pg_2'
      const response = await axios.get(url)
      const $ = cheerio.load(response.data)

      const products = [];
      
      $('div.a-section.a-spacing-base').each((idx,ele)=>{
          //const id = idx+1
          const image = $(ele).find('.s-image').attr('src');
          const title = $(ele).find('.a-size-base-plus.a-color-base.a-text-normal').text();
          const rating = $(ele).find('span[aria-label]').attr('aria-label')
          const price = $(ele).find('.a-price-whole').text();
          const priceElement =$(ele).find('span.a-price.a-text-price[data-a-size="b"][data-a-strike="true"][data-a-color="secondary"]');
          const discountPrice = priceElement.find('span.a-offscreen').text();  
          const offer = $(ele).find('span.a-letter-space').next().text();
          const urll ='https://www.amazon.in'
          const productlink =urll + $(ele).find('a').attr('href');

         products.push({source :'Amazon', image, title, rating, price, discountPrice,offer, productlink})
          
      })
      await Product.insertMany(products);
      //console.log(products);
      console.log('Amazon data scraped and saved to the database.');
  } catch (error) {
      console.log("Error scraping Amazon:", error)
  }
};

// Scrape Snapdeal
const scrapeSnapdeal = async () => {
  try {
    const url = 'https://www.snapdeal.com/search?keyword=mobiles&santizedKeyword=mobiles&catId=0&categoryId=0&suggested=false&vertical=p&noOfResults=20&searchState=categoryNavigation&clickSrc=go_header&lastKeyword=&prodCatId=&changeBackToAll=false&foundInAll=false&categoryIdSearched=&cityPageUrl=&categoryUrl=&url=&utmContent=&dealDetail=&sort=rlvncy';
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    const products = [];

    $('.product-tuple-listing').each((index, element) => {
      const image = $(element).find('img.product-image').attr('src');
      const title = $(element).find('p.product-title').text().trim();
      const rating = $(element).find('span.product-rating-count').text().trim();
      const price = $(element).find('span.product-price').text().trim();

      products.push({ source: 'Snapdeal', image, title, rating, price });
    });

    await Product.insertMany(products);
    console.log('Snapdeal data scraped and saved to the database.');
  } catch (error) {
    console.log('Error scraping Snapdeal:', error);
  }
};

// Run all scraping functions simultaneously
  async function runScraping (){
  try {
    await Promise.all([scrapeFlipkart(), scrapeAmazon()]);
    console.log('Scraping completed.');
  } catch (error) {
    console.log('Error running scraping:', error);
  }
};


// Run initial scraping on application load
// runScraping();

// Schedule scraping every 12 hours
setInterval(runScraping, 12 * 60 * 60 * 1000);
app.get('/scrape', async (req, res) => {
  try {
    await runScraping();
    res.send('Scraping completed successfully.');
  } catch (error) {
    console.error('Error scraping data:', error);
    res.status(500).send('Error scraping data.');
  }
});

// Define a route to fetch the scraped products from the database
app.get('/products', async (req, res) => {
  try {
    const products =await Product.find().lean();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Start the server
app.listen(PORT, () => {
  console.log(`API server localhost:${PORT}`);
});
