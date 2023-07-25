import express from "express";
import bodyParser from "body-parser";
import mongoose, { Schema } from "mongoose";
import _ from "lodash";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const username = process.env.USERNAME;
const password = process.env.PASSWORD;
const cluster = process.env.CLUSTER;
const database = process.env.DATABASE;

const uri = `mongodb+srv://${username}:${password}@${cluster}.fzgpz93.mongodb.net/${database}?retryWrites=true&w=majority`;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

async function main() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB!");

    const itemsSchema = new mongoose.Schema({
      name: String
    });

    const Item = mongoose.model("Item", itemsSchema);

    const defaultItems = [
      {name: "Welcome to your todo list."},
      {name: "Hit + button to add a new item."},
      {name: "👈 Hit this to delete an item."}
    ];

    const listSchema = new mongoose.Schema({
      name: String,
      items: [itemsSchema]
    });

    const List = mongoose.model("List", listSchema);

    app.get("/", async (req, res) => {
      const allItems = await Item.find();
      
      if (allItems.length === 0) {
        await Item.insertMany(defaultItems);
        res.redirect("/");
      } else {
        res.render("index.ejs", {
          listTitle: "Today", 
          newListItems: allItems
        });
      }
    });
    
    app.get("/:customListName", async (req, res) => {
      const customListName = _.capitalize(req.params.customListName);

      try {
        const foundList = await List.findOne({name: customListName}).exec();
        if (!foundList) {
          
          const list = new List({
            name: customListName,
            items: defaultItems
          });
          await list.save();
          res.redirect(`/${customListName}`);
        } else {
          
          res.render("index.ejs", {
            listTitle: foundList.name, 
            newListItems: foundList.items
          });
        }
      } catch (error) {
        console.error("Error occurred:", error);
      }
    });

    app.post("/", async (req, res) => {
      const itemName = req.body.newItem;
      const listName = req.body.list;

      const item = new Item({
        name: itemName
      });

      if (listName === "Today") {
        await item.save();
        res.redirect("/");
      } else {
        try {
          const foundList = await List.findOne({name: listName});
          foundList.items.push(item);
          foundList.save();
          res.redirect(`/${listName}`);
        } catch (error) {
          console.error("Error occurred:", error);
        }
      }
    });
    
    app.post("/delete", async (req, res) => {
      const checkedItemId = req.body.checkbox;
      const listName = req.body.listName;
      
      if (listName === "Today") {
        if (checkedItemId !== undefined) {
          try {
            await Item.findByIdAndDelete(checkedItemId);
            res.redirect("/");
          } catch (error) {
            console.error("Error occurred:", error);
            res.status(500).send("An error occurred while deleting the item.");
          }
        }
      } else {
        try {
          const foundList = await List.findOneAndUpdate(
            { name: listName },
            { $pull: { items: {_id: checkedItemId} } },
            { new: true }
          );
          res.redirect(`/${listName}`);
        } catch (error) {
          console.error(error);
        }
      }
    });
    
    app.get("/about", (req, res) => {
      res.render("about.ejs");
    });
    
    app.listen(port, () => {
      console.log(`Listening on port ${port}`);
    });
  } catch (err) {
    console.error("Error:", err);
  }
}

main().catch(err => console.error("Error:", err));
